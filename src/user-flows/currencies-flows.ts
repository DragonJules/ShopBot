import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessageFlags, StringSelectMenuBuilder } from "discord.js";
import { Currency } from "../database/database-types";
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, UserFlow, UserFlowComponentBuilder } from "./user-flow";
import { getCurrencies } from "../database/database-handler";
import { replyErrorMessage } from "../utils/utils";


export class CurrencyRemoveFlow extends UserFlow {
    id = 'currency-remove'
    protected components: Map<string, ExtendedComponent> = new Map()
    private selectedCurrency: Currency | null = null

    start(interaction: ChatInputCommandInteraction) {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, 'There isn\'t any currency, so you can\'t remove one. \n-# Use `/currencies-manage create` to create a new currency')    

        this.selectedCurrency = null

        this.initComponents()

        interaction.reply({ content: this.getMessage(), components: this.getComponents(), flags: MessageFlags.Ephemeral })
    }

    initComponents(): void {
        const currencySelect = new ExtendedStringSelectMenuComponent(
            `${this.id}+select-currency`,
            'Select a currency',
            getCurrencies(),
            this.updateInteraction,
            120_000
        )

        const submitButton = new ExtendedButtonComponent(`${this.id}+submit`, new ButtonBuilder()
            .setLabel('Remove Shop')
            .setEmoji({name: '⛔'})
            .setStyle(ButtonStyle.Danger)
            .setDisabled(this.selectedCurrency == null),
            this.updateInteraction,
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
        if (submitButton instanceof ExtendedButtonComponent) {
            submitButton.toggle(this.selectedCurrency != null)
        }
        
    }
}