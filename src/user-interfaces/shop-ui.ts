import { ActionRowBuilder, APIEmbedField, bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Colors, EmbedBuilder, GuildMember, InteractionCallbackResponse, ModalBuilder, ModalSubmitInteraction, roleMention, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js"
import { getOrCreateAccount, setAccountCurrencyAmount, setAccountItemAmount } from "../database/accounts/accounts-database"
import { getCurrencyName } from "../database/currencies/currencies-database"
import { DatabaseError } from "../database/database-types"
import { getProductName, getShopName, getShops } from "../database/shops/shops-database"
import { Product, PRODUCT_ACTION_TYPE, ProductActionType, Shop } from "../database/shops/shops-types"
import { ErrorMessages } from "../utils/constants"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/discord"
import { AccountUserInterface } from "./account-ui"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent } from "./extended-components"
import { MessageUserInterface, PaginatedEmbedUserInterface, UserInterfaceInteraction } from "./user-interfaces"
import { assertNeverReached } from "../utils/utils"

export class ShopUserInterface extends PaginatedEmbedUserInterface {
    public override id = 'shop-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()
    protected override embed: EmbedBuilder | null = null

    private selectedShop: Shop | null = null

    protected override page: number = 0
    protected override response: InteractionCallbackResponse | null = null

    private member: GuildMember | null = null

    protected override async predisplay(interaction: UserInterfaceInteraction): Promise<any> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        this.selectedShop = shops.entries().next().value?.[1]!

        this.member = interaction.member as GuildMember ?? null
    }

    protected override getMessage(): string { return '' }

    protected override initComponents(): void {
        const selectShopMenu = new ExtendedStringSelectMenuComponent(
            { customId : `${this.id}+select-shop`, placeholder: 'Select a shop', time: 120_000 },
            getShops(),
            async (interaction: StringSelectMenuInteraction, selected: Shop) => {
                this.page = 0
                this.selectedShop = selected
                this.updateInteraction(interaction) 
            }
        )

        const buyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+buy`,
                label: 'Buy a product',
                emoji: {name: '🪙'},
                style: ButtonStyle.Primary,
                time: 120_000,
                disabled: this.isBuyButtonDisabled()
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

                const buyProductUI = new BuyProductUserInterface(this.selectedShop)
                return buyProductUI.display(interaction)
            }
        )

        const showAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+show-account`,
                label: 'My account',
                emoji: {name: '💰'},
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => {
                const user = interaction.user
                const accountUI = new AccountUserInterface(user)
                accountUI.display(interaction)
            }
        )

        
        buyButton.toggle(this.selectedShop != null && this.selectedShop.products.size > 0 && !this.isBuyButtonDisabled())

        this.components.set(selectShopMenu.customId, selectShopMenu)
        this.components.set(buyButton.customId, buyButton)
        this.components.set(showAccountButton.customId, showAccountButton)
    }

    protected override initEmbeds(_interaction: UserInterfaceInteraction): void {
        if (!this.selectedShop) return

        const reservedToString = this.selectedShop.reservedTo !== undefined ? ` (${roleMention(this.selectedShop.reservedTo)} only)\n` : ''

        const shopEmbed = new EmbedBuilder()
            .setTitle(`${getShopName(this.selectedShop.id)!}`)
            .setDescription(`${reservedToString}${this.selectedShop.description}\n\nProducts:`)
            .setColor(Colors.Gold)


        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }

    protected override updateComponents() {
        const buyButton = this.components.get(`${this.id}+buy`)
        if (buyButton instanceof ExtendedButtonComponent && this.selectedShop != null) {
            buyButton.toggle(this.selectedShop.products.size > 0  && !this.isBuyButtonDisabled())
        }
    }

    protected override updateEmbeds() {
        const shopEmbed = this.embed

        if (!shopEmbed || !this.selectedShop) return

        const reservedToString = this.selectedShop.reservedTo !== undefined ? ` (${roleMention(this.selectedShop.reservedTo)} only)\n` : ''

        shopEmbed.setTitle(`${getShopName(this.selectedShop.id)!}`)
        shopEmbed.setDescription(`${reservedToString}${this.selectedShop.description}\nProducts: `)

        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }


    protected override getEmbedFields(): APIEmbedField[] {
        if (!this.selectedShop) return []
        if (this.selectedShop.products.size == 0) return [{ name: '\u200b', value: '🛒 *There is no product available here*' }]

        const fields: APIEmbedField[] = []

        this.selectedShop.products.forEach(product => {
            const descString = product.description ? product.description : '\u200b'

            fields.push({ 
                name: getProductName(this.selectedShop!.id, product.id)!,
                value: `Price: **${product.price} ${getCurrencyName(this.selectedShop!.currency.id)}**\n${descString}`, 
                inline: true 
            })
        })

        return fields
    }

    protected override getInputSize(): number {
        return this.selectedShop ? this.selectedShop.products.size : 0
    }


    private isBuyButtonDisabled() {
        if (!this.selectedShop) return false

        const isReserved = this.selectedShop.reservedTo
        if (!isReserved) return false
        
        if (!this.member) return false

        const isUserAuthorized = this.member.roles.cache.has(this.selectedShop.reservedTo!)
        const isUserAdmin = this.member.permissions.has('Administrator')

        return !isUserAuthorized && !isUserAdmin 
    }

}


export class BuyProductUserInterface extends MessageUserInterface {
    public override id = 'buy-product-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop
    private selectedProduct: Product | null = null

    private discountCode?: string = undefined
    private discount: number = 0

    constructor (selectedShop: Shop) {
        super()
        this.selectedShop = selectedShop
    }

    protected override async predisplay(interaction: UserInterfaceInteraction): Promise<any> {
        if (!this.selectedShop.products.size) return await replyErrorMessage(interaction, ErrorMessages.NoProducts)
    }

    protected override getMessage(): string {
        const discountCodeString = this.discountCode ? `\nDiscount code: ${bold(this.discountCode)}` : ''
        const priceString = this.priceString() != '' ? ` for ${this.priceString()}` : ''
        return `Buy **[${getProductName(this.selectedShop.id, this.selectedProduct?.id) || 'Select Product'}]** from ${bold(getShopName(this.selectedShop.id)!)}${priceString}.${discountCodeString}`
    }

    protected override initComponents(): void {
        const selectProductMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-product`,
                placeholder: 'Select a product',
                time: 120_000,
            },
            this.selectedShop.products,
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            }
        )

        const buyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+buy`,
                label: 'Buy',
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.buyProduct(interaction)
        )

        const discountCodeButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+discount-code`,
                label: 'I have a discount code',
                emoji: {name: '🎁'},
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.handleSetDiscountCodeInteraction(interaction)
        )

        this.components.set(selectProductMenu.customId, selectProductMenu)
        this.components.set(buyButton.customId, buyButton)
        this.components.set(discountCodeButton.customId, discountCodeButton)
    }

    protected override updateComponents(): void {
        const buyButton = this.components.get(`${this.id}+buy`)
        if (buyButton instanceof ExtendedButtonComponent) {
            buyButton.toggle(this.selectedProduct != null)
        }
    }

    private async handleSetDiscountCodeInteraction(interaction: ButtonInteraction) {
        const modalId = `${this.id}+set-discount-code-modal`

        const modal = new ModalBuilder()
            .setCustomId(modalId)
            .setTitle('Set Discount Code')
        
        const discountCodeInput = new TextInputBuilder()
            .setCustomId('discount-code-input')
            .setLabel('Discount Code')
            .setPlaceholder('XXXXXXX')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(8)
            .setMinLength(6)

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(discountCodeInput))

        await interaction.showModal(modal)

        const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
        const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
        
        const input = modalSubmit.fields.getTextInputValue('discount-code-input')
        if (!input) return this.updateInteraction(modalSubmit)

        const shopDiscountCodes = this.selectedShop.discountCodes
        if (!shopDiscountCodes[input]) return this.updateInteraction(modalSubmit)

        this.discountCode = input
        this.discount = shopDiscountCodes[input]
        this.updateInteraction(modalSubmit)
    }

    private async buyProduct(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!this.selectedProduct) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
        try {
            if (this.selectedShop.reservedTo && interaction.member instanceof GuildMember && !(interaction.member?.roles.cache.has(this.selectedShop.reservedTo) || interaction.member.permissions.has('Administrator'))) return replyErrorMessage(interaction, "You can't buy products from this shop")

            const user = await getOrCreateAccount(interaction.user.id)
            
            const userCurrencyAmount = user.currencies.get(this.selectedShop.currency.id)?.amount || 0
            const price = this.selectedProduct.price * (1 - this.discount / 100)

            if (userCurrencyAmount < price) return replyErrorMessage(interaction, `You don't have enough **${getCurrencyName(this.selectedShop.currency.id)!}** to buy this product`)
            
            setAccountCurrencyAmount(interaction.user.id, this.selectedShop.currency.id, userCurrencyAmount - price)
            
            if (this.selectedProduct.action != undefined) return this.buyActionProduct(interaction)

            const userProductAmount = user.inventory.get(this.selectedProduct.id)?.amount || 0
            setAccountItemAmount(interaction.user.id, this.selectedProduct, userProductAmount + 1)

            await updateAsSuccessMessage(interaction, `You successfully bought ${bold(getProductName(this.selectedShop.id, this.selectedProduct.id)!)} in ${bold(getShopName(this.selectedShop.id)!)} for ${this.priceString()}`)

            logToDiscord(interaction, `${interaction.member} purchased ${bold(getProductName(this.selectedShop.id, this.selectedProduct.id)!)} from ${bold(getShopName(this.selectedShop.id)!)} for ${this.priceString()} with discount code ${this.discountCode ? this.discountCode : 'none'}`)
            return
        } 
        catch (error) {
            return await replyErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }

    private priceString(): string {
        if (!this.selectedProduct) return ''
        const price = this.selectedProduct.price * (1 - this.discount / 100)
        return (this.discount == 0) ? `**${price} ${getCurrencyName(this.selectedShop.currency.id)!}**` : `~~${this.selectedProduct.price}~~ **${price} ${getCurrencyName(this.selectedShop.currency.id)!}**`
    }

    private async buyActionProduct(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!this.selectedProduct) return

        let actionMessage = ''

        switch (this.selectedProduct.action?.type) {
            case PRODUCT_ACTION_TYPE.GiveRole:
                const roleId = this.selectedProduct.action.options.roleId
                if (!roleId) return

                const member = interaction.member
                if (!(member instanceof GuildMember)) return

                member.roles.add(roleId)

                actionMessage = `You were granted the role ${bold(roleMention(roleId))}`
                break

            case PRODUCT_ACTION_TYPE.GiveCurrency:
                const currency = this.selectedProduct.action.options.currencyId
                if (!currency) return

                const amount = this.selectedProduct.action.options.amount
                if (!amount) return

                const user = await getOrCreateAccount(interaction.user.id)
                const userCurrencyAmount = user.currencies.get(this.selectedShop.currency.id)?.amount || 0

                setAccountCurrencyAmount(interaction.user.id, currency, userCurrencyAmount + amount)
                break
            default:
                break
        }


        await updateAsSuccessMessage(interaction, `You successfully bought ${bold(getProductName(this.selectedShop.id, this.selectedProduct.id)!)} in ${bold(getShopName(this.selectedShop.id)!)} for ${this.priceString()}.\n${actionMessage}`)

        logToDiscord(interaction, `${interaction.member} purchased ${bold(getProductName(this.selectedShop.id, this.selectedProduct.id)!)} from ${bold(getShopName(this.selectedShop.id)!)} for ${this.priceString()} with discount code ${this.discountCode ? this.discountCode : 'none'}. Action: ${this.selectedProduct.action?.type || 'none'} ${actionMessage}`)
        return

    }
}