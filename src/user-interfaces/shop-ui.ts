import { ActionRowBuilder, APIEmbedField, bold, ButtonBuilder, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, GuildMember, InteractionCallbackResponse, MessageFlags, ModalBuilder, ModalSubmitInteraction, roleMention, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js"
import { getCurrencyName, getOrCreateAccount, getProductName, getShopName, getShops, setAccountCurrencyAmount, setAccountItemAmount } from "../database/database-handler"
import { DatabaseError, Product, ProductActionType, Shop } from "../database/database-types"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils"
import { AccountUserInterface } from "./account-ui"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent } from "./extended-components"
import { EmbedUserInterface, MessageUserInterface, UserInterfaceInteraction } from "./user-interfaces"
import { ErrorMessages } from "../utils/constants"

const PRODUCTS_PER_PAGE = 9

export class ShopUserInterface extends EmbedUserInterface {
    public override id = 'shop-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()
    protected override embeds: Map<string, EmbedBuilder> = new Map()

    private selectedShop: Shop | null = null
    private shopPage: number = 0

    private response: InteractionCallbackResponse | null = null

    private paginationButtons: [ExtendedButtonComponent, ExtendedButtonComponent] = [
        new ExtendedButtonComponent(
            `${this.id}+previous-page`,
            new ButtonBuilder()
                .setEmoji({name: '⬅️'})
                .setStyle(ButtonStyle.Secondary),
            (interaction: ButtonInteraction) => this.previousPage(interaction),
            120_000
        ),
        new ExtendedButtonComponent(
            `${this.id}+next-page`,
            new ButtonBuilder()
                .setEmoji({name: '➡️'})
                .setStyle(ButtonStyle.Secondary),
            (interaction: ButtonInteraction) => this.nextPage(interaction),
            120_000
        )
    ]

    public override async display(interaction: UserInterfaceInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, ErrorMessages.NoShops)

        this.selectedShop = shops.entries().next().value?.[1]!

        this.initComponents()
        this.initEmbeds(interaction)
        this.updateComponents()
        this.updateEmbeds()

        const response = await interaction.reply({ embeds: this.getEmbeds(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        this.response = response
        return
    }

    protected override getMessage(): string {
        return ''
    }

    protected override initComponents(): void {
        const selectShopMenu = new ExtendedStringSelectMenuComponent(
            `${this.id}+select-shop`,
            'Select a shop',
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.shopPage = 0
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
            120_000
        )

        const buyButton = new ExtendedButtonComponent(
            `${this.id}+buy`,
            new ButtonBuilder()
                .setLabel('Buy a product')
                .setEmoji({name: '🪙'})
                .setStyle(ButtonStyle.Primary),
            (interaction: ButtonInteraction) => {
                if (!this.selectedShop) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

                const buyProductUI = new BuyProductUserInterface(this.selectedShop)
                return buyProductUI.display(interaction)
            },
            120_000
        )

        const showAccountButton = new ExtendedButtonComponent(
            `${this.id}+show-account`,
            new ButtonBuilder()
                .setLabel('My account')
                .setEmoji({name: '💰'})
                .setStyle(ButtonStyle.Secondary),
            (interaction: ButtonInteraction) => {
                const user = interaction.user
                const accountUI = new AccountUserInterface(user)
                accountUI.display(interaction)
            },
            120_000
        )

        
        buyButton.toggle(this.selectedShop != null && this.selectedShop.products.size > 0)

        this.components.set(selectShopMenu.customId, selectShopMenu)
        this.components.set(buyButton.customId, buyButton)
        this.components.set(showAccountButton.customId, showAccountButton)
    }

    protected override initEmbeds(interaction: UserInterfaceInteraction): void {
        if (!this.selectedShop) return

        const shopPages = this.getNumberOfPages()

        const shopEmbed = new EmbedBuilder()
            .setFooter({ text: `Page ${this.shopPage + 1}/${shopPages}`, iconURL: interaction.client.user.displayAvatarURL()})
            .setTitle(getShopName(this.selectedShop.id)!)
            .setDescription(`${this.selectedShop.description}\n\nProducts:`)
            .setColor(Colors.Gold)


        shopEmbed.setFields(this.getEmbedFields(this.shopPage))

        this.embeds.set('shop-embed', shopEmbed)
    }

    protected override updateComponents(): void {
        const buyButton = this.components.get(`${this.id}+buy`)
        if (buyButton instanceof ExtendedButtonComponent && this.selectedShop != null) {
            buyButton.toggle(this.selectedShop.products.size > 0)
        }

        const shopPages = this.getNumberOfPages()

        if (shopPages > 1) {
            if (this.response) {
                this.destroyComponentsCollectors()
            }
            
            this.paginationButtons[0].toggle(this.shopPage > 0)
            this.paginationButtons[1].toggle(this.shopPage < shopPages - 1)

            this.components.set(this.paginationButtons[0].customId, this.paginationButtons[0])
            this.components.set(this.paginationButtons[1].customId, this.paginationButtons[1])

            if (this.response) {
                this.createComponentsCollectors(this.response)
            }
        }
        else {
            if (this.response) {
                this.destroyComponentsCollectors()
            }
            
            this.components.delete(this.paginationButtons[0].customId)
            this.components.delete(this.paginationButtons[1].customId)

            if (this.response) {
                this.createComponentsCollectors(this.response)
            }
        }
    }

    protected override updateEmbeds() {
        const shopEmbed = this.embeds.get('shop-embed')
        if (shopEmbed instanceof EmbedBuilder && this.selectedShop != null) {
            const shopPages = this.getNumberOfPages()

            shopEmbed.setTitle(getShopName(this.selectedShop.id)!)
            shopEmbed.setDescription(`${this.selectedShop.description}\n\nProducts: `)
            shopEmbed.setFooter({ text: `Page ${this.shopPage + 1}/${shopPages}`})

            shopEmbed.setFields(this.getEmbedFields(this.shopPage))
        }
    }


    private getEmbedFields(page: number = 0): APIEmbedField[] {
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

        return fields.slice(page * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE + PRODUCTS_PER_PAGE)
    }

    private previousPage(interaction: ButtonInteraction) {
        if (this.shopPage == 0) return this.updateInteraction(interaction)

        this.shopPage -= 1
        return this.updateInteraction(interaction)   
    }

    private nextPage(interaction: ButtonInteraction) {
        const shopPages = this.getNumberOfPages()

        if (this.shopPage == shopPages - 1) return this.updateInteraction(interaction)

        this.shopPage += 1
        return this.updateInteraction(interaction)
    }

    getNumberOfPages(): number {
        return Math.max(Math.ceil(this.selectedShop!.products.size / PRODUCTS_PER_PAGE), 1)
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

    public override async display(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!this.selectedShop.products.size) return await replyErrorMessage(interaction, ErrorMessages.NoProducts)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        return this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        const discountCodeString = this.discountCode ? `\nDiscount code: ${bold(this.discountCode)}` : ''
        const priceString = this.priceString() != '' ? ` for ${this.priceString()}` : ''
        return `Buy **[${getProductName(this.selectedShop.id, this.selectedProduct?.id) || 'Select Product'}]** from ${bold(getShopName(this.selectedShop.id)!)}${priceString}.${discountCodeString}`
    }

    protected override initComponents(): void {
        const selectProductMenu = new ExtendedStringSelectMenuComponent(
            `${this.id}+select-product`,
            'Select a product',
            this.selectedShop.products,
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            },
            120_000
        )

        const buyButton = new ExtendedButtonComponent(
            `${this.id}+buy`,
            new ButtonBuilder()
                .setLabel('Buy')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success),
            (interaction: ButtonInteraction) => this.buyProduct(interaction),
            120_000
        )

        const discountCodeButton = new ExtendedButtonComponent(
            `${this.id}+discount-code`,
            new ButtonBuilder()
                .setLabel('I have a discount code')
                .setEmoji({name: '🎁'})
                .setStyle(ButtonStyle.Secondary),
            (interaction: ButtonInteraction) => this.handleSetDiscountCodeInteraction(interaction),
            120_000
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
            case ProductActionType.GiveRole:
                const roleId = this.selectedProduct.action.options.roleId
                if (!roleId) return

                const member = interaction.member
                if (!(member instanceof GuildMember)) return

                member.roles.add(roleId)

                actionMessage = `You were granted the role ${bold(roleMention(roleId))}`
                break

            case ProductActionType.GiveCurrency:
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