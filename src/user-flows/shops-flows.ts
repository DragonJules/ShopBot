import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, ModalBuilder, ModalSubmitInteraction, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import { createDiscountCode, createShop, getCurrencies, getShops, removeDiscountCode, removeShop, updateShopDescription, updateShopName } from "../database/database-handler";
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

export class DiscountCodeCreateFlow extends UserFlow {
    public override id: string = 'discount-code-create'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null
    private discountCode: string | null = null
    private discountAmount: number | null = null

    public override async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop./n-# Use `/shops-manage create` to create a new one')

        const discountCode = interaction.options.getString('code')?.replaceNonBreakableSpace().replace(/ /g, '').toUpperCase()
        const discountAmount = interaction.options.getInteger('amount')

        if (!discountCode || !discountAmount) return replyErrorMessage(interaction, 'Missing arguments')

        this.discountCode = discountCode
        this.discountAmount = discountAmount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        return `Create a discount code for **[${this.selectedShop?.name || 'Select Shop'}]**.\n**Code**: **${this.discountCode}**\n**Amount**: **${this.discountAmount}**%`
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
                .setLabel('Create Discount Code')
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
            if (!this.discountCode || !this.discountAmount) return updateAsErrorMessage(interaction, 'No selected discount code')

            await createDiscountCode(this.selectedShop.id, this.discountCode, this.discountAmount)

            await updateAsSuccessMessage(interaction, `You succesfully created the discount code **${this.discountCode}** for **${this.selectedShop.name}**.\n**Amount**: **${this.discountAmount}**%`)
        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return
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

    public override async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop./n-# Use `/shops-manage create` to create a new one')

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        if (this.stage == DiscountCodeRemoveStage.SELECT_SHOP) return `Remove a discount code from **[${this.selectedShop?.name || 'Select Shop'}]**.`
        if (this.stage == DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE) return `Remove discount code **[${this.selectedDiscountCode || 'Select Discount Code'}]** from **[${this.selectedShop!.name }]**.`

        return ''
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
                .setLabel('Submit Shop')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => {
                const shopDiscountCodes = this.selectedShop?.discountCodes

                if (!shopDiscountCodes || Object.keys(shopDiscountCodes).length == 0) return updateAsErrorMessage(interaction, 'The selected shop has no discount codes')

                this.changeStage(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)
                this.updateInteraction(interaction)
            },
            120_000
        )

        this.componentsByStage.set(DiscountCodeRemoveStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_SHOP)?.set(submitButton.customId, submitButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)    
        this.components.set(submitButton.customId, submitButton)

        const discountCodeSelectMenu = new ExtendedStringSelectMenuComponent<string>(
            `${this.id}+select-discount-code`,
            'Select a discount code',
            new Map(),
            (interaction: StringSelectMenuInteraction, selected: string): void => {
                this.selectedDiscountCode = selected
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitRemoveButton = new ExtendedButtonComponent(`${this.id}+remove-discount-code`,
            new ButtonBuilder()
                .setLabel('Remove Discount Code')
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
                this.selectedDiscountCode = null

                this.changeStage(DiscountCodeRemoveStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            },
            120_000
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
            if (!this.selectedShop) return updateAsErrorMessage(interaction, 'No selected shop')
            if (!this.selectedDiscountCode) return updateAsErrorMessage(interaction, 'No selected discount code')

            await removeDiscountCode(this.selectedShop.id, this.selectedDiscountCode)

            await updateAsSuccessMessage(interaction, `You succesfully removed the discount code **${this.selectedDiscountCode}** from **${this.selectedShop.name}**`)
        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return
        }
    }
}