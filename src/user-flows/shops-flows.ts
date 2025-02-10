import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, ModalBuilder, ModalSubmitInteraction, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import { createShop, getCurrencies, getShops, removeShop, updateShopDescription, updateShopName } from "../database/database-handler";
import { Currency, DatabaseError, Shop } from "../database/database-types";
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent } from "../user-interfaces/extended-components";
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils";
import { UserFlow } from "./user-flow";

export class ShopCreateFlow extends UserFlow {
    public id = 'shop-create'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private shopName: string | null = null

    public override async start(interaction: ChatInputCommandInteraction) {
        const currencies = getCurrencies()
        if (!currencies.size) return await replyErrorMessage(interaction, 'There isn\'t any currency, so you can\'t create a new shop.\n-# Use `/currencies-manage create` to create a new currency')

        const shopName = interaction.options.getString('name')?.replaceNonBreakableSpace()
        if (!shopName) return replyErrorMessage(interaction, 'Insufficient parameters')

        if (shopName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, 'The shop name can\'t contain only custom emojis')

        this.shopName = shopName

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        return `Create the shop **${this.shopName || 'No name specified'}** with the Currency **[${this.selectedCurrency?.name || 'No currency selected'}]**`
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
        this.disableComponents()

        try {
            if (!this.shopName) return updateAsErrorMessage(interaction, 'No shop name')
            if (!this.selectedCurrency) return updateAsErrorMessage(interaction, 'No selected currency')
            
            await createShop(this.shopName, '', this.selectedCurrency.id)

            await updateAsSuccessMessage(interaction, `You succesfully created the shop **${this.shopName}** with the currency **${this.selectedCurrency.name}**. \n-# Use \`/shops-manage remove\` to remove it`)

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
        if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop./n-# Use `/shops-manage create` to create a new one')

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
        this.disableComponents()

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

// TODO export class ShopReorderFlow extends UserFlow {}

export enum ShopUpdateOption {
    NAME = 'name',
    DESCRIPTION = 'description'
}

export class ShopUpdateFlow extends UserFlow {
    public override id: string = 'shop-update'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null

    private updateOption: ShopUpdateOption | null = null
    private updateOptionValue: string | null = null

    public override async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop./n-# Use `/shops-manage create` to create a new one')

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || Object.values(ShopUpdateOption).indexOf(subcommand as ShopUpdateOption) == -1) return replyErrorMessage(interaction, 'Unknown subcommand')
        this.updateOption = subcommand as ShopUpdateOption

        this.updateOptionValue = this.getUpdateValue(interaction, subcommand)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        return `Update **[${this.selectedShop?.name || 'Select Shop'}]**.\n**New ${this.updateOption}**: **${this.updateOptionValue}**`
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
                .setLabel('Update Shop')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
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
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, 'No selected shop')
            if (!this.updateOption || !this.updateOptionValue) return updateAsErrorMessage(interaction, 'No selected update option')
            
            const oldName = this.selectedShop.name

            switch (this.updateOption) {
                case ShopUpdateOption.NAME:
                    await updateShopName(this.selectedShop.id, this.updateOptionValue)
                    break
                case ShopUpdateOption.DESCRIPTION:
                    await updateShopDescription(this.selectedShop.id, this.updateOptionValue)
                    break
                default:
                    await updateAsErrorMessage(interaction, 'Unknown update option')
                    return
            }

            await updateAsSuccessMessage(interaction, `You succesfully updated the shop **${oldName}**.\n New **${this.updateOption}**: **${this.updateOptionValue}**`)
        }
        catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return 
        }
    }


    private getUpdateValue(interaction: ChatInputCommandInteraction, subcommand: string): string {
        switch (subcommand) {
            case ShopUpdateOption.NAME:
                return interaction.options.getString('new-name')?.replaceNonBreakableSpace() || ''
            case ShopUpdateOption.DESCRIPTION:
                return interaction.options.getString('new-description')?.replaceNonBreakableSpace() || ''
            default:
                return ''
        }
    }
}