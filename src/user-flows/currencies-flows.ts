import { ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js"
import { getCurrencies, removeCurrency, updateCurrency } from "../database/database-handler"
import { Currency, DatabaseError } from "../database/database-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showConfirmationModal } from "../user-interfaces/extended-components"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils"
import { UserFlow } from "./user-flow"
import { UserInterfaceInteraction } from "../user-interfaces/user-interfaces"
import { EMOJI_REGEX } from "../utils/constants"


export class CurrencyRemoveFlow extends UserFlow {
    id = 'currency-remove'
    protected components: Map<string, ExtendedComponent> = new Map()
    private selectedCurrency: Currency | null = null

    async start(interaction: ChatInputCommandInteraction) {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, 'There isn\'t any currency, so you can\'t remove one. \n-# Use `/currencies-manage create` to create a new currency')    

        this.selectedCurrency = null

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    initComponents(): void {
        const currencySelect = new ExtendedStringSelectMenuComponent<Currency>(
            `${this.id}+select-currency`,
            'Select a currency',
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitButton = new ExtendedButtonComponent(`${this.id}+submit`, 
            new ButtonBuilder()
                .setLabel('Remove Currency')
                .setEmoji({name: '⛔'})
                .setStyle(ButtonStyle.Danger)
                .setDisabled(this.selectedCurrency == null),
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)
                
                if (confirmed) return this.success(modalSubmitInteraction)
                
                this.updateInteraction(modalSubmitInteraction)
            },
            120_000
        )

        this.components.set(currencySelect.customId, currencySelect)
        this.components.set(submitButton.customId, submitButton)
    }
    
    getMessage(): string {
        return `Remove **[${this.selectedCurrency?.name || 'Select Currency'}]**, ⚠️ __**it will also remove shops using this currency and take it from user's accounts**__`
    }

    protected updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null) 
    }

    protected async success(interaction: ButtonInteraction | ModalSubmitInteraction) {
        this.disableComponents()

        // TODO : take currency from accounts owning it
        // TODO : remove currency from shops using it
        try {
            if (!this.selectedCurrency) return
            await removeCurrency(this.selectedCurrency.id)
            await updateAsSuccessMessage(interaction, `You succesfully removed the currency **${this.selectedCurrency.name}**`)
        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return 
        }
        
    }
}


export enum EditCurrencyOption {
    NAME = 'name',
    EMOJI = 'emoji'
}

export class EditCurrencyFlow extends UserFlow {
    id = 'currency-edit'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private updateOption: EditCurrencyOption | null = null
    private updateOptionValue: string | null = null

    async start(interaction: ChatInputCommandInteraction) {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, `There isn't any currency, so you can't edit one. \n-# Use \`/currencies-manage create\` to create a new currency`)    

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || Object.values(EditCurrencyOption).indexOf(subcommand as EditCurrencyOption) == -1) return replyErrorMessage(interaction, 'Unknown subcommand')
        this.updateOption = subcommand as EditCurrencyOption

        this.updateOptionValue = this.getUpdateValue(interaction, subcommand)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        return `Update **[${this.selectedCurrency?.name || 'Select Currency'}]**.\n**New ${this.updateOption}**: **${this.updateOptionValue}**`
    }

    protected override initComponents(): void {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent<Currency>(
            `${this.id}+select-currency`,
            'Select a currency',
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
            120_000
        )
    
        const submitButton = new ExtendedButtonComponent(`${this.id}+submit`, 
            new ButtonBuilder()
                .setLabel('Update Currency')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
                .setDisabled(this.selectedCurrency == null),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        this.components.set(currencySelectMenu.customId, currencySelectMenu)
        this.components.set(submitButton.customId, submitButton)
        
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected override async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        try {
            if (!this.selectedCurrency) return updateAsErrorMessage(interaction, 'No selected currency')
            if (!this.updateOption || this.updateOptionValue == undefined) return updateAsErrorMessage(interaction, 'No selected update option')
            
            const updateOption: Record<string, string | number> = {}
            updateOption[this.updateOption.toString()] = this.updateOptionValue

            const oldName = this.selectedCurrency.name

            await updateCurrency(this.selectedCurrency.id, updateOption)

            await updateAsSuccessMessage(interaction, `You succesfully updated the currency **${oldName}**. \nNew **${this.updateOption}**: **${this.updateOptionValue}**`)
        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return
        }
    }

    private getUpdateValue(interaction: ChatInputCommandInteraction, subcommand: string): string {
        switch (subcommand) {
            case EditCurrencyOption.NAME:
                return interaction.options.getString(`new-${subcommand}`)?.replaceSpaces() || ''
            case EditCurrencyOption.EMOJI:
                const emojiOption = interaction.options.getString(`new-${subcommand}`)
                return emojiOption?.match(EMOJI_REGEX)?.[0] || ''
            default:
                return ''
        }
    }
}