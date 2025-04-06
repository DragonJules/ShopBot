import { bold, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, StringSelectMenuInteraction, User, userMention } from "discord.js"
import { emptyAccount, getCurrencies, getCurrencyName, getOrCreateAccount, setAccountCurrencyAmount } from "../database/database-handler"
import { Currency, DatabaseError } from "../database/database-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showConfirmationModal } from "../user-interfaces/extended-components"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils"
import { UserFlow } from "./user-flow"
import { ErrorMessages } from "../utils/constants"

export class AccountGiveFlow extends UserFlow {
    public id = 'account-give'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    
    private target: User | null = null
    private amount: number | null = null

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `Can't give money. ${ErrorMessages.NoCurrencies}`)
    
        const target = interaction.options.getUser('target')
        const amount = interaction.options.getNumber('amount')
    
        if (!target || !amount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        this.target = target
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Give ${bold(`${this.amount} [${getCurrencyName(this.selectedCurrency?.id) || 'Select Currency'}]`)} to ${bold(`${this.target}`)}`
    }

    protected override initComponents(): void {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
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
                .setLabel('Submit')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )
    
        this.components.set(currencySelectMenu.customId, currencySelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null && this.target != null && this.amount != null)
    }

    protected async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()
        
        try {
            if (!this.selectedCurrency || !this.target || !this.amount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const currentBalance = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency.id)?.amount || 0
            await setAccountCurrencyAmount(this.target!.id, this.selectedCurrency.id, currentBalance + this.amount)

            return await updateAsSuccessMessage(interaction, `You successfully gave ${bold(`${this.amount}`)} ${getCurrencyName(this.selectedCurrency.id)} to ${userMention(this.target.id)}`)
            
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class AccountTakeFlow extends UserFlow {
    public id = 'account-take'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    
    private target: User | null = null
    private amount: number | null = null

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `Can't take money. ${ErrorMessages.NoCurrencies}`)
    
        const target = interaction.options.getUser('target')
        const amount = interaction.options.getNumber('amount')
    
        if (!target || !amount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        this.target = target
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Take ${bold(`${this.amount} [${getCurrencyName(this.selectedCurrency?.id) || 'Select Currency'}]`)} from ${bold(`${this.target}`)}`
    }

    protected override initComponents() {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
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
                .setLabel('Submit')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        const takeAllButton = new ExtendedButtonComponent(`${this.id}+take-all`, 
            new ButtonBuilder()
                .setLabel('Take all')
                .setEmoji('🔥')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            async (interaction: ButtonInteraction) => {
                if (!this.selectedCurrency || !this.target) return this.updateInteraction(interaction)

                this.amount = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency!.id)?.amount || 0
                this.success(interaction)
            },
            120_000
        )

        const emptyAccountButton = new ExtendedButtonComponent(`${this.id}+empty-account`,
            new ButtonBuilder()
                .setLabel('Empty account')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger),
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                await emptyAccount(this.target!.id, 'currencies')
                await updateAsSuccessMessage(modalSubmitInteraction, `You successfully emptied ${bold(`${this.target}`)} account`)
            },
            120_000
        )

        this.components.set(currencySelectMenu.customId, currencySelectMenu)
        this.components.set(submitButton.customId, submitButton)
        this.components.set(takeAllButton.customId, takeAllButton)
        this.components.set(emptyAccountButton.customId, emptyAccountButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (submitButton instanceof ExtendedButtonComponent) {
            submitButton.toggle(this.selectedCurrency != null)
        }

        const takeAllButton = this.components.get(`${this.id}+take-all`)
        if (takeAllButton instanceof ExtendedButtonComponent) {
            takeAllButton.toggle(this.selectedCurrency != null && this.target != null)
        }
    }

    protected async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()
        try {
            if (!this.selectedCurrency) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const currentBalance = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency.id)?.amount || 0
            const newBalance = Math.max(currentBalance - this.amount!, 0)
            
            await setAccountCurrencyAmount(this.target!.id, this.selectedCurrency.id, newBalance)

            return await updateAsSuccessMessage(interaction, `You successfully took ${bold(`${this.amount}`)} ${getCurrencyName(this.selectedCurrency.id)} from ${bold(`${this.target}`)}`)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}