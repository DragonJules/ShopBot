import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, roleMention, RoleSelectMenuInteraction, Snowflake, StringSelectMenuInteraction } from "discord.js"
import { getCurrencies, getCurrencyName } from "../database/currencies/currencies-database"
import { Currency } from "../database/currencies/currencies-types"
import { DatabaseError } from "../database/database-types"
import { addProduct, getProductName, getShopName, getShops, removeProduct, updateProduct } from "../database/shops/shops-database"
import { createProductAction, Product, ProductAction, ProductActionOptions, PRODUCT_ACTION_TYPE, Shop, ProductActionType, isProductActionType } from "../database/shops/shops-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedRoleSelectMenuComponent, ExtendedStringSelectMenuComponent, showEditModal } from "../user-interfaces/extended-components"
import { UserInterfaceInteraction } from "../user-interfaces/user-interfaces"
import { EMOJI_REGEX, ErrorMessages } from "../utils/constants"
import { PrettyLog } from "../utils/pretty-log"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/discord"
import { UserFlow } from "./user-flow"

export class AddProductFlow extends UserFlow {
    public id = "add-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    protected productName: string | null = null
    protected productPrice: number | null = null
    protected productEmoji: string | null = null
    protected productDescription: string | null = null

    protected selectedShop: Shop | null = null

    protected response: InteractionCallbackResponse | null = null

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        const productName = interaction.options.getString('name')?.replaceSpaces()
        const productDescription = interaction.options.getString('description')?.replaceSpaces() || ''
        const productPrice = interaction.options.getNumber('price')

        const productEmojiOption = interaction.options.getString('emoji')
        const productEmoji = productEmojiOption?.match(EMOJI_REGEX)?.[0] || ''

        if (!productName || productPrice == null) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)
    
        if (productName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, ErrorMessages.NotOnlyEmojisInName)
        
        this.productName = productName
        this.productPrice = +productPrice.toFixed(2)
        this.productEmoji = productEmoji
        this.productDescription = productDescription

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        this.response = response
        return
    }
    
    protected getMessage(): string {
        const descString = (this.productDescription) ? `. Description: ${bold(this.productDescription.replaceSpaces())}` : ''
        const nameString = bold(`${this.productEmoji ? `${this.productEmoji} ` : ''}${this.productName}`)
        return `Add Product: ${nameString} for **${this.productPrice} ${getCurrencyName(this.selectedShop?.currency.id) || '[ ]'}** in **[${getShopName(this.selectedShop?.id) || 'Select Shop'}]**${descString}`
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: 'Select a shop',
                time: 120_000
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-shop`,
                label: 'Add Product',
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)
    }

    protected updateComponents(): void {
        const submitShopButton = this.components.get(`${this.id}+submit-shop`)
        if (!(submitShopButton instanceof ExtendedButtonComponent)) return

        submitShopButton.toggle(this.selectedShop != null)
    }

    protected async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        try {
            if (!(this.selectedShop && this.productName && this.productPrice)) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            const newProduct = await addProduct(this.selectedShop.id, { 
                name: this.productName, 
                description: this.productDescription || '', 
                emoji: this.productEmoji || '', 
                price: this.productPrice
            })

            return await updateAsSuccessMessage(interaction, `You successfully added the product ${bold(getProductName(this.selectedShop.id, newProduct.id) || '')} to the shop ${bold(getShopName(this.selectedShop.id) || '')}`)

        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

enum AddActionProductFlowStage {
    SELECT_SHOP,
    SETUP_ACTION
}

export class AddActionProductFlow extends AddProductFlow {
    public override id = "add-action-product"

    private stage: AddActionProductFlowStage = AddActionProductFlowStage.SELECT_SHOP
    private componentsByStage: Map<AddActionProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private productActionType: ProductActionType | null = null
    private productAction: ProductAction| null = null

    private actionSetupCompleted: boolean = false

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const productActionType = interaction.options.getString('action')

        if (productActionType != null && !isProductActionType(productActionType)) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        this.productActionType = productActionType

        return await super.start(interaction)
    }

    protected override getMessage(): string {
        switch (this.stage) {
            case AddActionProductFlowStage.SELECT_SHOP:
                return super.getMessage()

            case AddActionProductFlowStage.SETUP_ACTION: 
                const descString = (this.productDescription) ? `. Description: ${bold(this.productDescription.replaceSpaces())}` : ''
                const productNameString = bold(`${this.productEmoji ? `${this.productEmoji} ` : ''}${this.productName}`)

                const productString = `Add Product: ${productNameString} for **${this.productPrice} ${getCurrencyName(this.selectedShop?.currency.id) || '[ ]'}** in **[${getShopName(this.selectedShop?.id) || 'Select Shop'}]**${descString}`

                let actionString = ''

                switch (this.productActionType) {
                    case PRODUCT_ACTION_TYPE.GiveRole:
                        const roleMentionString = (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveRole> | undefined)?.roleId ? roleMention((this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveRole>).roleId) : 'Unset'
                        actionString = `give **[${roleMentionString}]** role`
                        break
                    case PRODUCT_ACTION_TYPE.GiveCurrency:
                        const productActionAsGiveCurrency = (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>)
                        const isProductActionGiveCurrency = this.productAction != null && this.productAction?.options != undefined && (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).amount !== undefined && (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).currencyId !== undefined && productActionAsGiveCurrency != undefined 

                        const amountString = (isProductActionGiveCurrency && productActionAsGiveCurrency.amount >= 0) ? productActionAsGiveCurrency.amount : 'Unset'
                        const currency = (isProductActionGiveCurrency && productActionAsGiveCurrency.currencyId) ? getCurrencies().get(productActionAsGiveCurrency.currencyId) : undefined
                        const currencyString = getCurrencyName(currency?.id) || '[ ]'

                        actionString = `give **[${amountString}]** ${currencyString}`
                        break
                    default:
                        break
                }

                return `${productString}\nAction: ${actionString}`
        }
    }

    protected override initComponents(): void {
        super.initComponents()

        this.componentsByStage.set(AddActionProductFlowStage.SELECT_SHOP, new Map(this.components))

        this.componentsByStage.set(AddActionProductFlowStage.SETUP_ACTION, new Map())
        switch (this.productActionType) {
            case PRODUCT_ACTION_TYPE.GiveRole:
                const roleSelectMenu = new ExtendedRoleSelectMenuComponent(
                    {
                        customId: `${this.id}+select-role`,
                        placeholder: 'Select a role',
                        time: 120_000
                    },
                    (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake): void => {
                        this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveRole, { roleId: selectedRoleId })
                        this.actionSetupCompleted = true
                        this.updateInteraction(interaction)
                    }
                )

                this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(roleSelectMenu.customId, roleSelectMenu)
                break;
        
            case PRODUCT_ACTION_TYPE.GiveCurrency:
                const currencySelectMenu = new ExtendedStringSelectMenuComponent<Currency>(
                    {
                        customId: `${this.id}+select-currency`,
                        placeholder: 'Select a currency',
                        time: 120_000
                    },
                    getCurrencies(),
                    (interaction: StringSelectMenuInteraction, selected: Currency): void => {
                        this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveCurrency, { currencyId: selected.id, amount: -1 })
                        this.updateInteraction(interaction)
                    }
                )

                const setAmountButton = new ExtendedButtonComponent(
                    {
                        customId: `${this.id}+set-amount`,
                        label: 'Set Amount',
                        emoji: { name: '🪙' },
                        style: ButtonStyle.Secondary,
                        time: 120_000
                    },
                    async (interaction: ButtonInteraction) => {
                        const [modalSubmit, input] = await showEditModal(interaction, { edit: 'Amount', previousValue: '0' })

                        const amount = parseInt(input)
                        if (isNaN(amount) || amount < 0) return this.updateInteraction(modalSubmit)

                        this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveCurrency, {
                            currencyId: (this.productAction!.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).currencyId,
                            amount
                        })

                        this.actionSetupCompleted = true
                        this.updateInteraction(modalSubmit)
                    }
                )

                this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(currencySelectMenu.customId, currencySelectMenu)
                this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(setAmountButton.customId, setAmountButton)
                break

            default:
                break
        }

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: 'Submit',
                emoji: '✅',
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop`,
                label: 'Change Shop',
                emoji: {name: '📝'},
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.productAction = null
                this.actionSetupCompleted = false

                this.changeStage(AddActionProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(submitButton.customId, submitButton)
        this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(changeShopButton.customId, changeShopButton)
    }

    override updateComponents(): void {
        if (this.stage == AddActionProductFlowStage.SELECT_SHOP) super.updateComponents()

        if (this.stage == AddActionProductFlowStage.SETUP_ACTION) {
            const setAmountButton = this.components.get(`${this.id}+set-amount`)
            if (setAmountButton instanceof ExtendedButtonComponent) {
                setAmountButton.toggle(this.productAction != null && this.productAction.type == PRODUCT_ACTION_TYPE.GiveCurrency)
            }

            const submitButton = this.components.get(`${this.id}+submit`)
            if (submitButton instanceof ExtendedButtonComponent) {
                submitButton.toggle(this.productAction != null && this.actionSetupCompleted)
            }
        }
    }
    private changeStage(newStage: AddActionProductFlowStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()


        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected override async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (this.stage == AddActionProductFlowStage.SELECT_SHOP) {
            this.changeStage(AddActionProductFlowStage.SETUP_ACTION)
            return this.updateInteraction(interaction)
        }
        
        try {
            if (!(this.selectedShop && this.productName && this.productPrice != null && this.productAction)) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            const newProduct = await addProduct(this.selectedShop.id, { 
                name: this.productName, 
                description: this.productDescription || '', 
                emoji: this.productEmoji || '', 
                price: this.productPrice,
                action: this.productAction 
            })

            return await updateAsSuccessMessage(interaction, `You successfully added the product ${bold(getProductName(this.selectedShop.id, newProduct.id) || '')} to the shop ${bold(getShopName(this.selectedShop.id) || '')} with the action ${bold(`${this.productActionType}`)}`)

        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }

    }
}

enum RemoveProductFlowStage {
    SELECT_SHOP,
    SELECT_PRODUCT
}

export class RemoveProductFlow extends UserFlow {
    public id = "remove-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private stage: RemoveProductFlowStage = RemoveProductFlowStage.SELECT_SHOP
    private componentsByStage: Map<RemoveProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedProduct: Product | null = null

    private response: InteractionCallbackResponse | null = null

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected getMessage(): string {
        if (this.stage == RemoveProductFlowStage.SELECT_SHOP) return `Remove a Product from: **[${getShopName(this.selectedShop?.id) || 'Select Shop'}]**`
        if (this.stage == RemoveProductFlowStage.SELECT_PRODUCT) return `Remove Product: **[${getProductName(this.selectedShop?.id, this.selectedProduct?.id) || 'Select Product'}]** from ${bold(getShopName(this.selectedShop?.id) || '')}`

        PrettyLog.warning(`Unknown stage: ${this.stage}`)
        return ''
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: 'Select a shop',
                time: 120_000
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-shop`,
                time: 120_000,
                label: 'Submit Shop',
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => {
                if (this.selectedShop!.products.size == 0) return updateAsErrorMessage(interaction, ErrorMessages.NoProducts)

                this.changeStage(RemoveProductFlowStage.SELECT_PRODUCT)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(RemoveProductFlowStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>({
            customId: `${this.id}+select-product`,
            placeholder: 'Select a product',
            time: 120_000
        }, new Map(), (interaction: StringSelectMenuInteraction, selected: Product): void => {
            this.selectedProduct = selected
            this.updateInteraction(interaction)
        })

        const submitRemoveButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+remove-product`,
                label: 'Remove Product',
                emoji: {name: '⛔'},
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop`,
                label: 'Change Shop',
                emoji: {name: '📝'},
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedProduct = null

                this.changeStage(RemoveProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(RemoveProductFlowStage.SELECT_PRODUCT, new Map())
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(productSelectMenu.customId, productSelectMenu)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(submitRemoveButton.customId, submitRemoveButton)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(changeShopButton.customId, changeShopButton)
    }

    protected updateComponents(): void {
        if (this.stage == RemoveProductFlowStage.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == RemoveProductFlowStage.SELECT_PRODUCT) {
            const submitRemoveButton = this.components.get(`${this.id}+remove-product`)
            if (submitRemoveButton instanceof ExtendedButtonComponent) {
                submitRemoveButton.toggle(this.selectedProduct != null)
            }

            const selectProductMenu = this.components.get(`${this.id}+select-product`)
            if (selectProductMenu instanceof ExtendedStringSelectMenuComponent) {
                selectProductMenu.updateMap(this.selectedShop?.products || new Map())
            }
        }
    }

    private changeStage(newStage: RemoveProductFlowStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.selectedProduct) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            const oldProductName = getProductName(this.selectedShop.id, this.selectedProduct.id) || ''

            await removeProduct(this.selectedShop.id, this.selectedProduct.id)

            return await updateAsSuccessMessage(interaction, `You successfully removed the product ${bold(oldProductName)} from the shop ${bold(getShopName(this.selectedShop.id) || '')}`)

        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

enum EditProductFlowStage {
    SELECT_SHOP,
    SELECT_PRODUCT
}

export enum EditProductOption {
    NAME = 'name',
    DESCRIPTION = 'description',
    PRICE = 'price',
    EMOJI = 'emoji'
}

export class EditProductFlow extends UserFlow {
    public id = "edit-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private stage: EditProductFlowStage = EditProductFlowStage.SELECT_SHOP
    private componentsByStage: Map<EditProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private updateOption: EditProductOption | null = null
    private updateOptionValue: string | null = null

    private selectedShop: Shop | null = null
    private selectedProduct: Product | null = null

    private response: InteractionCallbackResponse | null = null

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, `There isn't any shop with products./n-# Use \`/shops-manage create\` to create a new shop, and \`/products-manage add\` to add products`)

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !Object.values(EditProductOption).includes(subcommand as EditProductOption)) return replyErrorMessage(interaction, ErrorMessages.InvalidSubcommand)
        this.updateOption = subcommand as EditProductOption

        this.updateOptionValue = this.getUpdateValue(interaction, subcommand)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected getMessage(): string {
        if (this.stage == EditProductFlowStage.SELECT_SHOP) return `Edit product from ${bold(`[${getShopName(this.selectedShop?.id) || 'Select Shop'}]`)}.\nNew ${bold(`${this.updateOption}`)}: ${bold(`${this.updateOptionValue}`)}`
        if (this.stage == EditProductFlowStage.SELECT_PRODUCT) return `Edit Product: ${bold(`[${getProductName(this.selectedShop?.id, this.selectedProduct?.id) || 'Select Product'}]`)} from ${bold(getShopName(this.selectedShop?.id) || '')}. \nNew ${bold(`${this.updateOption}`)}: ${bold(`${this.updateOptionValue}`)}`

        PrettyLog.warning(`Unknown stage: ${this.stage}`)
        return ''
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: 'Select a shop',
                time: 120_000
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-shop`,
                time: 120_000,
                label: 'Submit Shop',
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => {
                if (this.selectedShop!.products.size == 0) return updateAsErrorMessage(interaction, ErrorMessages.NoProducts)

                this.changeStage(EditProductFlowStage.SELECT_PRODUCT)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditProductFlowStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(EditProductFlowStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(EditProductFlowStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>({
            customId: `${this.id}+select-product`,
            placeholder: 'Select a product',
            time: 120_000
        }, new Map(), (interaction: StringSelectMenuInteraction, selected: Product): void => {
            this.selectedProduct = selected
            this.updateInteraction(interaction)
        })

        const submitEditButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+edit-product`,
                time: 120_000,
                label: 'Edit Product',
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop`,
                time: 120_000,
                label: 'Change Shop',
                emoji: {name: '📝'},
                style: ButtonStyle.Secondary
            },
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedProduct = null

                this.changeStage(EditProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditProductFlowStage.SELECT_PRODUCT, new Map())
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(productSelectMenu.customId, productSelectMenu)
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(submitEditButton.customId, submitEditButton)
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(changeShopButton.customId, changeShopButton)
    }

    protected updateComponents(): void {
        if (this.stage == EditProductFlowStage.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == EditProductFlowStage.SELECT_PRODUCT) {
            const submitRemoveButton = this.components.get(`${this.id}+edit-product`)
            if (submitRemoveButton instanceof ExtendedButtonComponent) {
                submitRemoveButton.toggle(this.selectedProduct != null)
            }

            const selectProductMenu = this.components.get(`${this.id}+select-product`)
            if (selectProductMenu instanceof ExtendedStringSelectMenuComponent) {
                selectProductMenu.updateMap(this.selectedShop?.products || new Map())
            }
        }
    }

    private changeStage(newStage: EditProductFlowStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.selectedProduct) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.updateOption || this.updateOptionValue == undefined) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const updateOption: Record<string, string | number> = {}
            updateOption[this.updateOption.toString()] = (this.updateOption == EditProductOption.PRICE) ? Number(this.updateOptionValue) : this.updateOptionValue

            const oldName = getProductName(this.selectedShop.id, this.selectedProduct.id) || ''

            await updateProduct(this.selectedShop.id, this.selectedProduct.id, updateOption)

            return await updateAsSuccessMessage(interaction, `You successfully updated the product ${bold(oldName)} from the shop ${bold(getShopName(this.selectedShop.id) || '')}. \nNew ${bold(this.updateOption)}: ${bold(this.updateOptionValue)}`)

        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return
        }
    }

    private getUpdateValue(interaction: ChatInputCommandInteraction, subcommand: string): string {
        switch (subcommand) {
            case EditProductOption.NAME:
                return interaction.options.getString(`new-${subcommand}`)?.replaceSpaces() || ''
            case EditProductOption.DESCRIPTION:
                return interaction.options.getString(`new-${subcommand}`)?.replaceSpaces() || ''
            case EditProductOption.PRICE:
                return`${interaction.options.getNumber(`new-${subcommand}`)?.toFixed(2) || ''}`
            case EditProductOption.EMOJI:
                const emojiOption = interaction.options.getString(`new-${subcommand}`)
                return emojiOption?.match(EMOJI_REGEX)?.[0] || ''
            default:
                return ''
        }
    }
}