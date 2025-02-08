import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, ModalBuilder, ModalSubmitInteraction, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, UserFlow, UserFlowInteraction } from "./user-flow";
import { createShop, getCurrencies, getShops, removeShop } from "../database/database-handler";
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils";
import { Currency, DatabaseError, Shop } from "../database/database-types";

export class ShopCreateFlow extends UserFlow {
    public id = 'shop-create'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private shopName: string | null = null

    public override async start(interaction: ChatInputCommandInteraction) {
        const currencies = getCurrencies()
        if (!currencies.size) return await replyErrorMessage(interaction, 'There isn\'t any currency, so you can\'t create a new shop.\n-# Use `/currencies-manage create` to create a new currency')

        const shopName = interaction.options.getString('shop-name')?.replaceNonBreakableSpace()
        if (shopName == null) return replyErrorMessage(interaction)

        if (shopName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, 'The shop name can\'t contain only custom emojis')

        this.shopName = shopName

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        return `Create the shop **${this.shopName || 'No name specified'}** with the Currency **[${this.selectedCurrency?.name || 'No currency selected'}]**`
    }

    protected override initComponents(): void {
        const selectCurrencyMenu = new ExtendedStringSelectMenuComponent(
            `${this.id}+select-currency`, 
            'Select a currency', getCurrencies(), 
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitButton = new ExtendedButtonComponent(`${this.id}+submit`, 
            new ButtonBuilder()
                .setLabel('Submit')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        const changeShopNameButton = new ExtendedButtonComponent(`${this.id}+change-shop-name`, 
            new ButtonBuilder()
                .setLabel('Change Shop Name')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Secondary),
            (interaction: ButtonInteraction) => this.handleChangeShopNameInteraction(interaction),
            120_000
        )

        this.components.set(selectCurrencyMenu.customId, selectCurrencyMenu)
        this.components.set(submitButton.customId, submitButton)
        this.components.set(changeShopNameButton.customId, changeShopNameButton)
    }

    private async handleChangeShopNameInteraction(interaction: ButtonInteraction) {
        const modalId = `${this.id}+change-shop-name-modal`

        const modal = new ModalBuilder()
            .setCustomId(modalId)
            .setTitle('Change Shop Name')
        
        const shopNameInput = new TextInputBuilder()
            .setCustomId('shop-name-input')
            .setLabel('New Shop Name')
            .setPlaceholder(this.shopName || 'Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(120)
            .setMinLength(1)

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(shopNameInput))

        await interaction.showModal(modal)

        const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId;
        const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
        
        this.shopName = modalSubmit.fields.getTextInputValue('shop-name-input').replaceNonBreakableSpace()
        this.updateInteraction(modalSubmit)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected override async success(interaction: ButtonInteraction) {
        try {
            if (!this.shopName) return updateAsErrorMessage(interaction, 'No shop name')
            if (!this.selectedCurrency) return updateAsErrorMessage(interaction, 'No selected currency')
            
            await createShop(this.shopName, '', this.selectedCurrency.id)

            await updateAsSuccessMessage(interaction, `You succesfully created the shop **${this.shopName}** with the currency **${this.selectedCurrency.name}**. \n-# Use \`/shops-manage remove\` to remove it`)

        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return 
        }
    }
}

export class ShopRemoveFlow extends UserFlow {
    public id = 'shop-remove'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null

    public override async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop, use `/shops-manage create` to create a new one')

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        return `Remove **[${this.selectedShop?.name || 'Select Shop'}]**`
    }

    protected override initComponents(): void {
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
                .setCustomId('submit-shop-remove')
                .setLabel('Remove Shop')
                .setEmoji({name: '⛔'})
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)
    }


    protected override async success(interaction: ButtonInteraction) {
        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, 'No selected shop')
            
            await removeShop(this.selectedShop.id)

            await updateAsSuccessMessage(interaction, `You succesfully removed the shop **${this.selectedShop.name}**`)
        }
        catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return 
        }
    }
}