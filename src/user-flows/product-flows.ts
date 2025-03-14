import { bold, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, StringSelectMenuInteraction } from "discord.js"
import { addProduct, getShops, removeProduct, updateProduct } from "../database/database-handler"
import { DatabaseError, Product, Shop } from "../database/database-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent } from "../user-interfaces/extended-components"
import { UserInterfaceInteraction } from "../user-interfaces/user-interfaces"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils"
import { UserFlow } from "./user-flow"
import { EMOJI_REGEX, ErrorMessages } from "../utils/constants"

export class AddProductFlow extends UserFlow {
    public id = "add-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private productName: string | null = null
    private productPrice: number | null = null
    private productEmoji: string | null = null
    private productDescription: string | null = null

    private selectedShop: Shop | null = null

    public async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        const productName = interaction.options.getString('name')?.replaceSpaces()
        const productDescription = interaction.options.getString('description')?.replaceSpaces() || ''
        const productPrice = interaction.options.getNumber('price')

        const productEmojiOption = interaction.options.getString('emoji')
        const productEmoji = productEmojiOption?.match(EMOJI_REGEX)?.[0] || ''

        if (!productName || !productPrice) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)
    
        if (productName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, ErrorMessages.NotOnlyEmojisInName)
        
        this.productName = productName
        this.productPrice = +productPrice.toFixed(2)
        this.productEmoji = productEmoji
        this.productDescription = productDescription

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }
    
    protected getMessage(): string {
        const descString = (this.productDescription) ? `. Description: ${bold(this.productDescription.replaceSpaces())}` : ''
        return `Add Product: ${bold(`${this.productName}`)} for **${this.productPrice} ${this.selectedShop?.currency.name || '[]'}** in **[${this.selectedShop?.name || 'Select Shop'}]**${descString}`
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            `${this.id}+select-shop`,
            'Select a shop',
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitButton = new ExtendedButtonComponent(`${this.id}+submit`,
            new ButtonBuilder()
                .setLabel('Add Product')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)
    }

    protected async success(interaction: UserInterfaceInteraction) {
        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.productName) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.productPrice) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            await addProduct(this.selectedShop.id, { name: this.productName, description: this.productDescription || '', emoji: this.productEmoji || '', price: this.productPrice })

            await updateAsSuccessMessage(interaction, `You succesfully added the product ${bold(this.productName)} to the shop ${bold(this.selectedShop.name)}`)

        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return
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

    public async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
    }

    protected getMessage(): string {
        if (this.stage == RemoveProductFlowStage.SELECT_SHOP) return `Remove a Product from: **[${this.selectedShop?.name || 'Select Shop'}]**`
        if (this.stage == RemoveProductFlowStage.SELECT_PRODUCT) return `Remove Product: **[${this.selectedProduct?.name || 'Select Product'}]** from **[${this.selectedShop?.name}]**`

        return ''
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            `${this.id}+select-shop`,
            'Select a shop',
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitShopButton = new ExtendedButtonComponent(`${this.id}+submit-shop`,
            new ButtonBuilder()
                .setLabel('Submit Shop')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => {
                if (this.selectedShop!.products.size == 0) return updateAsErrorMessage(interaction, ErrorMessages.NoProducts)

                this.changeStage(RemoveProductFlowStage.SELECT_PRODUCT)
                this.updateInteraction(interaction)
            },
            120_000
        )

        this.componentsByStage.set(RemoveProductFlowStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>(
            `${this.id}+select-product`,
            'Select a product',
            new Map(),
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            },    
            120_000
        )

        const submitRemoveButton = new ExtendedButtonComponent(`${this.id}+remove-product`,
            new ButtonBuilder()
                .setLabel('Remove Product')
                .setEmoji({name: '⛔'})
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        const changeShopButton = new ExtendedButtonComponent(`${this.id}+change-shop`,
            new ButtonBuilder()
                .setLabel('Change Shop')
                .setEmoji({name: '📝'})
                .setStyle(ButtonStyle.Secondary),
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedProduct = null

                this.changeStage(RemoveProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            },
            120_000
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

    protected async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.selectedProduct) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            await removeProduct(this.selectedShop.id, this.selectedProduct.id)

            await updateAsSuccessMessage(interaction, `You succesfully removed the product ${bold(this.selectedProduct.name)} from the shop ${bold(this.selectedShop.name)}`)

        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return
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

export class UpdateProductFlow extends UserFlow {
    public id = "edit-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private stage: EditProductFlowStage = EditProductFlowStage.SELECT_SHOP
    private componentsByStage: Map<EditProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private updateOption: EditProductOption | null = null
    private updateOptionValue: string | null = null

    private selectedShop: Shop | null = null
    private selectedProduct: Product | null = null

    private response: InteractionCallbackResponse | null = null

    public async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, `There isn't any shop with products./n-# Use \`/shops-manage create\` to create a new shop, and \`/products-manage add\` to add products`)

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || Object.values(EditProductOption).indexOf(subcommand as EditProductOption) == -1) return replyErrorMessage(interaction, ErrorMessages.InvalidSubcommand)
        this.updateOption = subcommand as EditProductOption

        this.updateOptionValue = this.getUpdateValue(interaction, subcommand)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
    }

    protected getMessage(): string {
        if (this.stage == EditProductFlowStage.SELECT_SHOP) return `Update product from ${bold(`[${this.selectedShop?.name || 'Select Shop'}]`)}.\nNew ${bold(`${this.updateOption}`)}: ${bold(`${this.updateOptionValue}`)}`

        if (this.stage == EditProductFlowStage.SELECT_PRODUCT) return `Update Product: ${bold(`[${this.selectedProduct?.name || 'Select Product'}]`)} from ${bold(this.selectedShop!.name)}. \nNew ${bold(`${this.updateOption}`)}: ${bold(`${this.updateOptionValue}`)}`

        return ''
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            `${this.id}+select-shop`,
            'Select a shop',
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitShopButton = new ExtendedButtonComponent(`${this.id}+submit-shop`,
            new ButtonBuilder()
                .setLabel('Submit Shop')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => {
                if (this.selectedShop!.products.size == 0) return updateAsErrorMessage(interaction, ErrorMessages.NoProducts)

                this.changeStage(EditProductFlowStage.SELECT_PRODUCT)
                this.updateInteraction(interaction)
            },
            120_000
        )

        this.componentsByStage.set(EditProductFlowStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(EditProductFlowStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(EditProductFlowStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>(
            `${this.id}+select-product`,
            'Select a product',
            new Map(),
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            },    
            120_000
        )

        const submitUpdateButton = new ExtendedButtonComponent(`${this.id}+update-product`,
            new ButtonBuilder()
                .setLabel('Update Product')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        const changeShopButton = new ExtendedButtonComponent(`${this.id}+change-shop`,
            new ButtonBuilder()
                .setLabel('Change Shop')
                .setEmoji({name: '📝'})
                .setStyle(ButtonStyle.Secondary),
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedProduct = null

                this.changeStage(EditProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            },
            120_000
        )

        this.componentsByStage.set(EditProductFlowStage.SELECT_PRODUCT, new Map())
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(productSelectMenu.customId, productSelectMenu)
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(submitUpdateButton.customId, submitUpdateButton)
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(changeShopButton.customId, changeShopButton)
    }

    protected updateComponents(): void {
        if (this.stage == EditProductFlowStage.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == EditProductFlowStage.SELECT_PRODUCT) {
            const submitRemoveButton = this.components.get(`${this.id}+update-product`)
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

    protected async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.selectedProduct) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.updateOption || this.updateOptionValue == undefined) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const updateOption: Record<string, string | number> = {}
            updateOption[this.updateOption.toString()] = (this.updateOption == EditProductOption.PRICE) ? Number(this.updateOptionValue) : this.updateOptionValue

            const oldName = this.selectedProduct.name

            await updateProduct(this.selectedShop.id, this.selectedProduct.id, updateOption)

            await updateAsSuccessMessage(interaction, `You succesfully updated the product ${bold(oldName)} from the shop ${bold(this.selectedShop.name)}. \nNew ${bold(this.updateOption)}: ${bold(this.updateOptionValue)}`)

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