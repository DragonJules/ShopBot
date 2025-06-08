import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, roleMention, Snowflake, StringSelectMenuInteraction } from "discord.js"
import { getCurrencies, getCurrencyName } from "../database/currencies/currencies-database"
import { Currency } from "../database/currencies/currencies-types"
import { DatabaseError } from "../database/database-types"
import { createDiscountCode, createShop, getShopName, getShops, removeDiscountCode, removeShop, updateShop, updateShopCurrency, updateShopPosition } from "../database/shops/shops-database"
import { Shop } from "../database/shops/shops-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showEditModal } from "../user-interfaces/extended-components"
import { UserInterfaceInteraction } from "../user-interfaces/user-interfaces"
import { EMOJI_REGEX, ErrorMessages } from "../utils/constants"
import { PrettyLog } from "../utils/pretty-log"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/discord"
import { UserFlow } from "./user-flow"
import { assertNeverReached } from "../utils/utils"

export class ShopCreateFlow extends UserFlow {
    public id = 'shop-create'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private shopName: string | null = null
    private shopEmoji: string | null = null
    private shopDescription: string | null = null
    private shopReservedTo: Snowflake | undefined = undefined

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return await replyErrorMessage(interaction, `Can't create a new shop. ${ErrorMessages.NoCurrencies}`)

        const shopName = interaction.options.getString('name')?.replaceSpaces()
        const shopDescription = interaction.options.getString('description')?.replaceSpaces()  || ''
        const emojiOption = interaction.options.getString('emoji')
        const shopEmoji = emojiOption?.match(EMOJI_REGEX)?.[0] || ''
        const shopReservedTo = interaction.options.getRole('reserved-to')?.id

        if (!shopName) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        if (shopName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, ErrorMessages.NotOnlyEmojisInName)

        this.shopName = shopName
        this.shopEmoji = shopEmoji
        this.shopDescription = shopDescription
        this.shopReservedTo = shopReservedTo

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return 
    }

    protected override getMessage(): string {
        const shopNameString = bold(`${this.shopEmoji ? `${this.shopEmoji} ` : ''}${this.shopName!}`)
        return `Create the shop **${shopNameString}** with the Currency **[${getCurrencyName(this.selectedCurrency?.id) || 'Select currency'}]**`
    }

    protected override initComponents(): void {
        const selectCurrencyMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: 'Select a currency', time: 120_000 },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
        )
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

        const changeShopNameButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-name`,
                label: 'Change Shop Name',
                emoji: '📝',
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, newShopName] = await showEditModal(interaction, { edit: 'Shop Name', previousValue: this.shopName || undefined })
                
                this.shopName = newShopName
                this.updateInteraction(modalSubmit)
            }
        )

        const changeShopEmojiButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-emoji`,
                label: 'Change Shop Emoji',
                emoji: '✏️',
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, newShopEmoji] = await showEditModal(interaction, { edit: 'Shop Emoji', previousValue: this.shopEmoji || undefined })
                
                this.shopEmoji = newShopEmoji?.match(EMOJI_REGEX)?.[0] || this.shopEmoji
                this.updateInteraction(modalSubmit)
            }
        )

        this.components.set(selectCurrencyMenu.customId, selectCurrencyMenu)
        this.components.set(submitButton.customId, submitButton)
        this.components.set(changeShopNameButton.customId, changeShopNameButton)
        this.components.set(changeShopEmojiButton.customId, changeShopEmojiButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.shopName) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.selectedCurrency) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const newShop = await createShop(this.shopName, this.shopDescription || '', this.selectedCurrency.id, this.shopEmoji || '', this.shopReservedTo)

            return await updateAsSuccessMessage(interaction, `You successfully created the shop ${bold(getShopName(newShop.id) || '')} with the currency ${bold(getCurrencyName(newShop.currency.id) || '')}. \n-# Use \`/shops-manage remove\` to remove it`)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class ShopRemoveFlow extends UserFlow {
    public id = 'shop-remove'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Remove **[${getShopName(this.selectedShop?.id) || 'Select Shop'}]**`
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>({
            customId: `${this.id}+select-shop`,
            placeholder: 'Select a shop',
            time: 120_000
        }, getShops(), (interaction: StringSelectMenuInteraction, selected: Shop): void => {
            this.selectedShop = selected
            this.updateInteraction(interaction)
        })

        const submitButton = new ExtendedButtonComponent({
            customId: `${this.id}+submit`,
            time: 120_000,
            label: 'Remove Shop',
            emoji: {name: '⛔'},
            style: ButtonStyle.Danger,
            disabled: true
        }, (interaction: ButtonInteraction) => this.success(interaction))

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)
    }


    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            await removeShop(this.selectedShop.id)

            return await updateAsSuccessMessage(interaction, `You successfully removed the shop ${bold(getShopName(this.selectedShop.id) || '')}`)
        }
        catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class ShopReorderFlow extends UserFlow {
    public id = 'shop-reorder'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null
    private selectedPosition: number | null = null


    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        this.initComponents()

        this.selectedShop = shops.values().next().value!
        this.selectedPosition = 0 + 1

        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Change position of ${bold(`[${getShopName(this.selectedShop?.id) || 'Select Shop'}]`)} to ${bold(`${this.selectedPosition || 'Select Position'}`)}`
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: 'Select a shop',
                time: 120_000,
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                const shopsArray = Array.from(getShops().keys())
                const shopIndex = shopsArray.findIndex(id => id === selected.id)

                this.selectedPosition = shopIndex + 1
                this.updateInteraction(interaction)
            },
        )

        const upButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+up`,
                time: 120_000,
                label: '',
                emoji: {name: '⬆️'},
                style: ButtonStyle.Primary,
                disabled: this.selectedPosition != null && this.selectedPosition < getShops().size,
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedPosition) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
                this.selectedPosition = Math.max(this.selectedPosition - 1, 1)
                return this.updateInteraction(interaction)
            }
        )

        const downButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+down`,
                time: 120_000,
                label: '',
                emoji: {name: '⬇️'},
                style: ButtonStyle.Primary,
                disabled: this.selectedPosition != null && this.selectedPosition > 1,
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedPosition) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
                this.selectedPosition = Math.min(this.selectedPosition + 1, getShops().size)
            
                return this.updateInteraction(interaction)
            }
        )

        const submitNewPositionButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-new-position`,
                time: 120_000,
                label: 'Submit position',
                emoji: {name: ''},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(upButton.customId, upButton)
        this.components.set(downButton.customId, downButton)
        this.components.set(submitNewPositionButton.customId, submitNewPositionButton)
    }

    protected override updateComponents(): void {
        const submitNewPositionButton = this.components.get(`${this.id}+submit-new-position`)
        if (submitNewPositionButton instanceof ExtendedButtonComponent) {
            submitNewPositionButton.toggle(this.selectedShop != null && this.selectedPosition != null)
        }

        const upButton = this.components.get(`${this.id}+up`)
        if (upButton instanceof ExtendedButtonComponent) {
            upButton.toggle(this.selectedPosition != null && this.selectedPosition > 1)
        }

        const downButton = this.components.get(`${this.id}+down`)
        if (downButton instanceof ExtendedButtonComponent) {
            downButton.toggle(this.selectedPosition != null && this.selectedPosition < getShops().size)
        }
    }

    protected override async success(interaction: ButtonInteraction) {
        try {
            if (!this.selectedShop || !this.selectedPosition) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            updateShopPosition(this.selectedShop.id, this.selectedPosition - 1)
            await updateAsSuccessMessage(interaction, `You successfully changed the position of ${bold(getShopName(this.selectedShop?.id) || '')} to ${bold(`${this.selectedPosition}`)}`)
            return
        }
        catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return 
        }
    }
}

export const NO_VALUE = 'no-value'

export const EDIT_SHOP_OPTIONS = {
    Name: 'name',
    Description: 'description',
    Emoji: 'emoji',
    ReservedTo: 'reserved-to-role'
} as const;

type EditShopOption = typeof EDIT_SHOP_OPTIONS[keyof typeof EDIT_SHOP_OPTIONS]

function isShopOption(subcommand: string): subcommand is EditShopOption { return Object.values(EDIT_SHOP_OPTIONS).includes(subcommand as EditShopOption) }
function getShopOptionName(option: EditShopOption): string { 
    switch (option) {
        case EDIT_SHOP_OPTIONS.Name:
        case EDIT_SHOP_OPTIONS.Description:
        case EDIT_SHOP_OPTIONS.Emoji:
            return option
        case EDIT_SHOP_OPTIONS.ReservedTo:
            return 'reservedTo'
        default:
            assertNeverReached(option)
    }
}

export class EditShopFlow extends UserFlow {
    public override id: string = 'edit-shop'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null

    private updateOption: EditShopOption | null = null
    private updateOptionValue: string | null = null
    private updateOptionValueDisplay: string | null = null

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !isShopOption(subcommand)) return replyErrorMessage(interaction, ErrorMessages.InvalidSubcommand)
        this.updateOption = subcommand as EditShopOption
        
        try {
            this.updateOptionValue = this.getUpdateValue(interaction, subcommand) 
        }
        catch (error) {
            return replyErrorMessage(interaction, (error instanceof Error) ? error.message : undefined)
        }
        
        this.updateOptionValueDisplay = this.getUpdateValueDisplay(interaction, subcommand) || this.updateOptionValue

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Edit **[${getShopName(this.selectedShop?.id) || 'Select Shop'}]**.\n**New ${this.updateOption}**: ${bold(`${this.updateOptionValueDisplay}`)}`
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>({
            customId: `${this.id}+select-shop`,
            placeholder: 'Select a shop',
            time: 120_000,
        },
        getShops(),
        (interaction: StringSelectMenuInteraction, selected: Shop): void => {
            this.selectedShop = selected
            this.updateInteraction(interaction)
        },
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                time: 120_000,
                label: 'Edit Shop',
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => this.success(interaction),
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.updateOption || !this.updateOptionValue || !this.updateOptionValueDisplay) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const oldName = getShopName(this.selectedShop?.id) || ''

            await updateShop(this.selectedShop.id, { [getShopOptionName(this.updateOption)]: this.updateOptionValue })

            return await updateAsSuccessMessage(interaction, `You successfully edited the shop ${bold(oldName)}.\n New ${bold(this.updateOption)}: ${bold(this.updateOptionValueDisplay)}`)
        }
        catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }


    private getUpdateValue(interaction: ChatInputCommandInteraction, subcommand: EditShopOption): string {
        let updateValue: string | undefined

        switch (subcommand) {
            case EDIT_SHOP_OPTIONS.Name:
                updateValue = interaction.options.getString('new-name')?.replaceSpaces()
                break
            case EDIT_SHOP_OPTIONS.Description:
                updateValue = interaction.options.getString('new-description')?.replaceSpaces()
                break
            case EDIT_SHOP_OPTIONS.Emoji:
                const emojiOption = interaction.options.getString('new-emoji')
                updateValue = emojiOption?.match(EMOJI_REGEX)?.[0] || NO_VALUE
                break
            case EDIT_SHOP_OPTIONS.ReservedTo:
                updateValue = interaction.options.getRole('reserved-to-role')?.id || NO_VALUE
                break
            default:
                assertNeverReached(subcommand)
        }

        if (!updateValue) throw new Error(ErrorMessages.InsufficientParameters)

        return updateValue
    }

    private getUpdateValueDisplay(interaction: ChatInputCommandInteraction, subcommand: EditShopOption): string | null {
        switch (subcommand) {
            case EDIT_SHOP_OPTIONS.ReservedTo:
                const role = interaction.options.getRole('reserved-to-role')
                if (!role) return 'None'
                return roleMention(role.id)
            
            default:
                return null
        }
    }
}


enum EditShopCurrencyStage {
    SELECT_SHOP, SELECT_CURRENCY
}

export class EditShopCurrencyFlow extends UserFlow {
    public override id: string = 'edit-shop-currency'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private stage: EditShopCurrencyStage = EditShopCurrencyStage.SELECT_SHOP
    private componentsByStage: Map<EditShopCurrencyStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedCurrency: Currency | null = null

    private response: InteractionCallbackResponse | null = null

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        if (this.stage === EditShopCurrencyStage.SELECT_SHOP) return `Change the currency of **[${getShopName(this.selectedShop?.id) || 'Select Shop'}]**.`
        if (this.stage === EditShopCurrencyStage.SELECT_CURRENCY) return `Change the currency of **${getShopName(this.selectedShop?.id)}** to **[${getCurrencyName(this.selectedCurrency?.id) || 'Select Currency'}]**.`

        PrettyLog.warning(`Unknown stage: ${this.stage}`)
        return ''
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: 'Select a shop',
                time: 120_000,
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
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
                this.changeStage(EditShopCurrencyStage.SELECT_CURRENCY)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditShopCurrencyStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const currencySelectMenu = new ExtendedStringSelectMenuComponent<Currency>(
            {
                customId: `${this.id}+select-currency`,
                placeholder: 'Select a currency',
                time: 120_000,
            },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
        )
        const submitCurrencyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-currency`,
                time: 120_000,
                label: 'Submit Currency',
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
                this.selectedCurrency = null

                this.changeStage(EditShopCurrencyStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditShopCurrencyStage.SELECT_CURRENCY, new Map())
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_CURRENCY)?.set(currencySelectMenu.customId, currencySelectMenu)
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_CURRENCY)?.set(submitCurrencyButton.customId, submitCurrencyButton)
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_CURRENCY)?.set(changeShopButton.customId, changeShopButton)
    }

    protected override updateComponents(): void {
        if (this.stage == EditShopCurrencyStage.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == EditShopCurrencyStage.SELECT_CURRENCY) {
            const submitUpdateButton = this.components.get(`${this.id}+submit-currency`)
            if (submitUpdateButton instanceof ExtendedButtonComponent) {
                submitUpdateButton.toggle(this.selectedCurrency != null)
            }
        }
    }

    private changeStage(newStage: EditShopCurrencyStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected override async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!this.selectedShop || !this.selectedCurrency) return await updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        try {
            updateShopCurrency(this.selectedShop.id, this.selectedCurrency.id)
            
            return await updateAsSuccessMessage(interaction, `You successfully updated the currency for the shop ${bold(getShopName(this.selectedShop.id) || '')} to ${bold(getCurrencyName(this.selectedCurrency.id) || '')}`)
        }
        catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class DiscountCodeCreateFlow extends UserFlow {
    public override id: string = 'discount-code-create'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null
    private discountCode: string | null = null
    private discountAmount: number | null = null

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        const discountCode = interaction.options.getString('code')?.replaceSpaces().replace(/ /g, '').toUpperCase()
        const discountAmount = interaction.options.getInteger('amount')

        if (!discountCode || !discountAmount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        this.discountCode = discountCode
        this.discountAmount = discountAmount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Create a discount code for **[${getShopName(this.selectedShop?.id) || 'Select Shop'}]**.\n**Code**: ${bold(`${this.discountCode}\nAmount: ${this.discountAmount}`)}%`
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>({
            customId: `${this.id}+select-shop`,
            placeholder: 'Select a shop',
            time: 120_000,
        },
        getShops(),
        (interaction: StringSelectMenuInteraction, selected: Shop): void => {
            this.selectedShop = selected
            this.updateInteraction(interaction)
        })

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: 'Create Discount Code',
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)    
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)

    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.discountCode || !this.discountAmount) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            await createDiscountCode(this.selectedShop.id, this.discountCode, this.discountAmount)

            return await updateAsSuccessMessage(interaction, `You successfully created the discount code ${bold(this.discountCode)} for ${bold(getShopName(this.selectedShop?.id) || '')}.\n${bold(`Amount: ${this.discountAmount}`)}%`)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

enum DiscountCodeRemoveStage {
    SELECT_SHOP,
    SELECT_DISCOUNT_CODE
}

export class DiscountCodeRemoveFlow extends UserFlow {
    public override id: string = 'discount-code-remove'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private stage: DiscountCodeRemoveStage = DiscountCodeRemoveStage.SELECT_SHOP
    private componentsByStage: Map<DiscountCodeRemoveStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedDiscountCode: string | null = null

    private response: InteractionCallbackResponse | null = null

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        if (this.stage == DiscountCodeRemoveStage.SELECT_SHOP) return `Remove a discount code from ${bold(`[${getShopName(this.selectedShop?.id) || 'Select Shop'}]`)}.`
        if (this.stage == DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE) return `Remove discount code ${bold(`[${this.selectedDiscountCode || 'Select Discount Code'}]`)} from ${bold(`[${getShopName(this.selectedShop?.id)}]`)}.`

        PrettyLog.warning(`Unknown stage: ${this.stage}`)
        return ''
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: 'Select a shop',
                time: 120_000,
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                time: 120_000,
                label: 'Submit Shop',
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => {
                const shopDiscountCodes = this.selectedShop?.discountCodes

                if (!shopDiscountCodes || Object.keys(shopDiscountCodes).length == 0) return updateAsErrorMessage(interaction, 'The selected shop has no discount codes')

                this.changeStage(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(DiscountCodeRemoveStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_SHOP)?.set(submitButton.customId, submitButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)    
        this.components.set(submitButton.customId, submitButton)

        const discountCodeSelectMenu = new ExtendedStringSelectMenuComponent<string>({
            customId: `${this.id}+select-discount-code`,
            placeholder: 'Select a discount code',
            time: 120_000,
        },
        new Map(),
        (interaction: StringSelectMenuInteraction, selected: string): void => {
            this.selectedDiscountCode = selected
            this.updateInteraction(interaction)
        })

        const submitRemoveButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+remove-discount-code`,
                time: 120_000,
                label: 'Remove Discount Code',
                emoji: {name: '⛔'},
                style: ButtonStyle.Danger,
                disabled: true
            },
            (interaction: ButtonInteraction) => this.success(interaction),
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
                this.selectedDiscountCode = null

                this.changeStage(DiscountCodeRemoveStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            },
        )

        this.componentsByStage.set(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE, new Map())
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)?.set(discountCodeSelectMenu.customId, discountCodeSelectMenu)
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)?.set(submitRemoveButton.customId, submitRemoveButton)
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)?.set(changeShopButton.customId, changeShopButton)
    }

    protected override updateComponents(): void {
        if (this.stage == DiscountCodeRemoveStage.SELECT_SHOP) {
            const submitButton = this.components.get(`${this.id}+submit`)
            if (!(submitButton instanceof ExtendedButtonComponent)) return

            submitButton.toggle(this.selectedShop != null)
        } 
        
        if (this.stage == DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE) {
            const submitRemoveButton = this.components.get(`${this.id}+remove-discount-code`)
            if (submitRemoveButton instanceof ExtendedButtonComponent) {
                submitRemoveButton.toggle(this.selectedDiscountCode != null)
            }

            const selectDiscountCodeMenu = this.components.get(`${this.id}+select-discount-code`)
            if (selectDiscountCodeMenu instanceof ExtendedStringSelectMenuComponent) {
                selectDiscountCodeMenu.updateMap(new Map(Object.keys(this.selectedShop?.discountCodes || {}).map(code => [code, code])))
            }
        }
    }

    private changeStage(newStage: DiscountCodeRemoveStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.selectedDiscountCode) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            await removeDiscountCode(this.selectedShop.id, this.selectedDiscountCode)

            return await updateAsSuccessMessage(interaction, `You successfully removed the discount code ${bold(this.selectedDiscountCode)} from ${bold(getShopName(this.selectedShop?.id)!)}`)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}