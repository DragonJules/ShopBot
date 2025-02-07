import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Message, MessageComponentInteraction, MessageFlags, StringSelectMenuBuilder, StringSelectMenuInteraction } from "discord.js";
import { Currency, DatabaseError } from "../database/database-types";
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, UserFlow, UserFlowComponentBuilder, UserFlowInteraction } from "./user-flow";
import { getCurrencies, removeCurrency } from "../database/database-handler";
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils";


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
        const currencySelect = new ExtendedStringSelectMenuComponent(
            `${this.id}+select-currency`,
            'Select a currency',
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitButton = new ExtendedButtonComponent(`${this.id}+submit`, new ButtonBuilder()
            .setLabel('Remove Currency')
            .setEmoji({name: '⛔'})
            .setStyle(ButtonStyle.Danger)
            .setDisabled(this.selectedCurrency == null),
            (interaction) => this.success(interaction),
            120_000
        )

        this.components.set(currencySelect.customId, currencySelect)
        this.components.set(submitButton.customId, submitButton)
    }
    
    getMessage(): string {
        return `Remove **[${this.selectedCurrency?.name || 'Select Currency'}]**, ⚠️ __**it will also remove shops using this currency and take it from user's accounts**__`
    }

    protected updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null) 
    }

    protected success(interaction: ButtonInteraction): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(false)

        // TODO : take currency from accounts owning it
        // TODO : remove currency from shops using it
        try {
            if (!this.selectedCurrency) return
            removeCurrency(this.selectedCurrency.id)
            updateAsSuccessMessage(interaction, `You succesfully removed the currency **${this.selectedCurrency.name}**`)
            console.log('tf')
        } catch (error) {
            updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return 
        }
        
    }
}