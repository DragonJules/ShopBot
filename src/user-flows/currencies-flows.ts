import { ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js"
import { getCurrencies, removeCurrency } from "../database/database-handler"
import { Currency, DatabaseError } from "../database/database-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showConfirmationModal } from "../user-interfaces/extended-components"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils"
import { UserFlow } from "./user-flow"


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