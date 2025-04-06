import { bold, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, italic, MessageFlags, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js"
import { getCurrencies, getCurrencyName, getShopName, getShopsWithCurrency, removeCurrency, takeCurrencyFromAccounts, updateCurrency } from "../database/database-handler"
import { Currency, DatabaseError } from "../database/database-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showConfirmationModal } from "../user-interfaces/extended-components"
import { UserInterfaceInteraction } from "../user-interfaces/user-interfaces"
import { EMOJI_REGEX, ErrorMessages } from "../utils/constants"
import { PrettyLog } from "../utils/pretty-log"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils"
import { UserFlow } from "./user-flow"


export class CurrencyRemoveFlow extends UserFlow {
    id = 'currency-remove'
    protected components: Map<string, ExtendedComponent> = new Map()
    private selectedCurrency: Currency | null = null

    async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, ErrorMessages.NoCurrencies)

        this.selectedCurrency = null

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return 
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
                
                return this.updateInteraction(modalSubmitInteraction)
            },
            120_000
        )

        this.components.set(currencySelect.customId, currencySelect)
        this.components.set(submitButton.customId, submitButton)
    }
    
    getMessage(): string {  
        if (this.selectedCurrency) {
            const shopsWithCurrency = getShopsWithCurrency(this.selectedCurrency.id)

            if (shopsWithCurrency.size > 0) {
                const shopsWithCurrencyNames = Array.from(shopsWithCurrency.values()).map(shop => bold(italic(getShopName(shop.id) || ''))).join(', ')

                return `⚠️ Can't remove **${getCurrencyName(this.selectedCurrency.id)}** ! The following shops are still using it : ${shopsWithCurrencyNames}. \n-# Please consider removing them (\`/shops-manage remove\`) or changing their currency (\`/shops-manage change-currency\`) before removing the currency.`
            }
        }

        return `Remove **[${getCurrencyName(this.selectedCurrency?.id) || 'Select Currency'}]**, ⚠️ __**it will also take it from user's accounts**__`
    }

    protected updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        const shopsWithCurrency = getShopsWithCurrency(this.selectedCurrency?.id || '')

        submitButton.toggle((this.selectedCurrency != null) && (shopsWithCurrency.size == 0)) 
    }

    protected async success(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (this.selectedCurrency == null) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)

            await takeCurrencyFromAccounts(this.selectedCurrency.id)

            const currencyName = getCurrencyName(this.selectedCurrency.id) || ''

            await removeCurrency(this.selectedCurrency.id)
            return await updateAsSuccessMessage(interaction, `You successfully removed the currency ${bold(currencyName)}`)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
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

    async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, ErrorMessages.NoCurrencies)    

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !Object.values(EditCurrencyOption).includes(subcommand as EditCurrencyOption)) return replyErrorMessage(interaction, ErrorMessages.InvalidSubcommand)
        this.updateOption = subcommand as EditCurrencyOption

        this.updateOptionValue = this.getUpdateValue(interaction, subcommand)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Edit **[${getCurrencyName(this.selectedCurrency?.id) || 'Select Currency'}]**.\n**New ${this.updateOption}**: ${bold(`${this.updateOptionValue}`)}`
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
                .setLabel('Edit Currency')
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
            if (!this.selectedCurrency) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            if (!this.updateOption || this.updateOptionValue == undefined) return updateAsErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const oldName = getCurrencyName(this.selectedCurrency.id) || ''

            await updateCurrency(this.selectedCurrency.id, { [this.updateOption.toString()]: this.updateOptionValue } )

            return await updateAsSuccessMessage(interaction, `You successfully edited the currency ${bold(oldName)}. \nNew ${bold(this.updateOption)}: ${bold(this.updateOptionValue)}`)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
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
                PrettyLog.warning(`Unknown edit currency option: ${subcommand}`)
                return ''
        }
    }
}