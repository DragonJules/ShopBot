import { ActionRowBuilder, APIEmbed, APIEmbedField, ButtonBuilder, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, InteractionCallbackResponse, MessageFlags, ModalBuilder, ModalSubmitInteraction, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent } from "./extended-components"
import { EmbedUserInterface, MessageUserInterface, UserInterfaceInteraction } from "./user-interfaces"
import { getOrCreateAccount, getShops, setAccountCurrencyAmount, setAccountItemAmount } from "../database/database-handler"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils"
import { DatabaseError, Product, Shop } from "../database/database-types"
import { AccountUserInterface } from "./account-ui"

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

    public override async display(interaction: UserInterfaceInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop.\n-# Use `/shops-manage create` to create a new one')

        this.selectedShop = shops.entries().next().value?.[1]!

        this.initComponents()
        this.initEmbeds(interaction)
        this.updateComponents()
        this.updateEmbeds()

        const response = await interaction.reply({ embeds: this.getEmbeds(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        this.response = response
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
                if (!this.selectedShop) return updateAsErrorMessage(interaction, 'No selected shop')

                const buyProductUI = new BuyProductUserInterface(this.selectedShop)
                buyProductUI.display(interaction)
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

        const shopPages = Math.ceil(this.selectedShop.products.size / PRODUCTS_PER_PAGE)

        const shopEmbed = new EmbedBuilder()
            .setFooter({ text: `Page ${this.shopPage + 1}/${shopPages}`, iconURL: interaction.client.user.displayAvatarURL()})
            .setTitle(this.selectedShop.name)
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

        const shopPages = Math.ceil(this.selectedShop!.products.size / PRODUCTS_PER_PAGE)

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
            const shopPages = Math.ceil(this.selectedShop.products.size / PRODUCTS_PER_PAGE)
            const emojiString = this.selectedShop.emoji != null ? `${this.selectedShop.emoji} ` : ''

            shopEmbed.setTitle(`${emojiString}${this.selectedShop.name}`)
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
            
            const productEmojiString = product.emoji ? `${product.emoji} ` : ''
            const currencyEmojiString = this.selectedShop!.currency.emoji ? `${this.selectedShop!.currency.emoji} ` : ''

            fields.push({ 
                name: `${productEmojiString}${product.name}`, 
                value: `Price: **${product.price} ${currencyEmojiString}${this.selectedShop!.currency.name}**\n${descString}`, 
                inline: true 
            })
        })

        return fields.slice(page * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE + PRODUCTS_PER_PAGE)
    }

    private previousPage(interaction: ButtonInteraction) {
        if (this.shopPage == 0) return this.updateInteraction(interaction)

        this.shopPage -= 1
        this.updateInteraction(interaction)
    }

    private nextPage(interaction: ButtonInteraction) {
        const shopPages = Math.ceil(this.selectedShop!.products.size / PRODUCTS_PER_PAGE)

        if (this.shopPage == shopPages - 1) return this.updateInteraction(interaction)

        this.shopPage += 1
        this.updateInteraction(interaction)
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

    public override async display(interaction: UserInterfaceInteraction) {
        if (!this.selectedShop.products.size) return await replyErrorMessage(interaction, 'There is no product available here')

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        const discountCodeString = this.discountCode ? `\nDiscount code: **${this.discountCode}**` : ''
        return `Buy **[${this.selectedProduct?.name || 'Select Product'}]** from **${this.selectedShop.name}**.${discountCodeString}`
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

    private async buyProduct(interaction: UserInterfaceInteraction) {
        if (!this.selectedProduct) return
        try {
            const user = await getOrCreateAccount(interaction.user.id)
            
            const userCurrencyAmount = user.currencies.get(this.selectedShop.currency.id)?.amount || 0
            const price = this.selectedProduct.price * (1 - this.discount / 100)

            if (userCurrencyAmount < price) return replyErrorMessage(interaction, `You don\'t have enough ${this.selectedShop.currency.name} to buy this product`)
            
            setAccountCurrencyAmount(interaction.user.id, this.selectedShop.currency.id, userCurrencyAmount - price)

            const productCurrencyAmount = user.inventory.get(this.selectedProduct.id)?.amount || 0
            setAccountItemAmount(interaction.user.id, this.selectedProduct, productCurrencyAmount + 1)

            const priceString = (this.discount == 0) ? `**${price} ${this.selectedShop.currency.name}**` : `~~${this.selectedProduct.price}~~ **${price} ${this.selectedShop.currency.name}**`

            await updateAsSuccessMessage(interaction, `You succesfully bought **${this.selectedProduct.name}** in **${this.selectedShop.name}** for ${priceString}`)

            logToDiscord(interaction, `${interaction.member} purchased **${this.selectedProduct.name}** from **${this.selectedShop.name}** for ${priceString}** with discount code ${this.discountCode ? this.discountCode : 'none'}`)
        } catch (error) {
            await replyErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}