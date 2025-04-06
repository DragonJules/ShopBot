import { APIEmbedField, ButtonBuilder, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, MessageFlags, User } from "discord.js"
import { getOrCreateAccount } from "../database/database-handler"
import { Account } from "../database/database-types"
import { ExtendedButtonComponent, ExtendedComponent } from "./extended-components"
import { EmbedUserInterface, UserInterfaceInteraction } from "./user-interfaces"

enum AccountDisplayMode {
    CURRENCIES,
    INVENTORY
}
// TODO Pagination
export class AccountUserInterface extends EmbedUserInterface {
    public override id: string = 'account-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()
    protected override embeds: Map<string, EmbedBuilder> = new Map()

    private embedsByDisplayMode: Map<AccountDisplayMode, Map<string, EmbedBuilder>> = new Map()

    private user: User
    private account: Account | null = null

    private displayMode: AccountDisplayMode = AccountDisplayMode.CURRENCIES

    constructor(user: User) {
        super()
        this.user = user
    }

    public override async display(interaction: UserInterfaceInteraction): Promise<void> {
        this.account = await getOrCreateAccount(this.user.id)

        this.initComponents()
        this.initEmbeds(interaction)

        const response = await interaction.reply({ embeds: this.getEmbeds(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }

    protected override getMessage(): string {
        return ''
    }

    protected override initEmbeds(interaction: UserInterfaceInteraction): void {
        const currenciesEmbed = new EmbedBuilder()
            .setTitle(`💰 _${this.user.displayName}_'s Account`)
            .setColor(Colors.Gold)
            .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})
            .setFields(this.getAccountFields())

        const inventoryEmbed = new EmbedBuilder()
            .setTitle(`💼 _${this.user.displayName}_'s Inventory`)
            .setColor(Colors.DarkGreen)
            .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})
            .setFields(this.getInventoryFields())

        this.embedsByDisplayMode.set(AccountDisplayMode.CURRENCIES, new Map([['currencies-embed', currenciesEmbed]]))
        this.embedsByDisplayMode.set(AccountDisplayMode.INVENTORY, new Map([['inventory-embed', inventoryEmbed]]))

        this.embeds.set('currencies-embed', currenciesEmbed)
    }

    protected override updateEmbeds(): void {
        switch (this.displayMode) {
            case AccountDisplayMode.CURRENCIES:
                const currenciesEmbed = this.embedsByDisplayMode.get(AccountDisplayMode.CURRENCIES)?.get('currencies-embed') 
                if (!currenciesEmbed) return

                currenciesEmbed.setFields(this.getAccountFields()) 

                this.embeds = new Map()
                this.embeds.set('currencies-embed', this.embedsByDisplayMode.get(AccountDisplayMode.CURRENCIES)!.get('currencies-embed')!)
                break
            case AccountDisplayMode.INVENTORY:
                const inventoryEmbed = this.embedsByDisplayMode.get(AccountDisplayMode.INVENTORY)?.get('inventory-embed') 
                if (!inventoryEmbed) return

                inventoryEmbed.setFields(this.getInventoryFields())

                this.embeds = new Map()
                this.embeds.set('inventory-embed', this.embedsByDisplayMode.get(AccountDisplayMode.INVENTORY)!.get('inventory-embed')!)
                break
        }
    }

    protected override initComponents(): void {
        const showAccountButton = new ExtendedButtonComponent(
            `${this.id}+show-account`,
            new ButtonBuilder()
                .setLabel('Show account')
                .setEmoji({name: '💰'})
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this.displayMode == AccountDisplayMode.CURRENCIES),
            (interaction: ButtonInteraction) => this.changeDisplayMode(interaction, AccountDisplayMode.CURRENCIES), 
            120_000
        )

        const showInventoryButton = new ExtendedButtonComponent(
            `${this.id}+show-inventory`,
            new ButtonBuilder()
                .setLabel('Show inventory')
                .setEmoji({name: '💼'})
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this.displayMode == AccountDisplayMode.INVENTORY),
            (interaction: ButtonInteraction) => this.changeDisplayMode(interaction, AccountDisplayMode.INVENTORY),
            120_000
        )

        this.components.set(showAccountButton.customId, showAccountButton)
        this.components.set(showInventoryButton.customId, showInventoryButton)
    }

    protected override updateComponents(): void {
        const showAccountButton = this.components.get(`${this.id}+show-account`)
        if (showAccountButton instanceof ExtendedButtonComponent) {
            showAccountButton.toggle(this.displayMode != AccountDisplayMode.CURRENCIES)
        }

        const showInventoryButton = this.components.get(`${this.id}+show-inventory`)
        if (showInventoryButton instanceof ExtendedButtonComponent) {
            showInventoryButton.toggle(this.displayMode != AccountDisplayMode.INVENTORY)
        }
    }

    private changeDisplayMode(interaction: UserInterfaceInteraction, newDisplayMode: AccountDisplayMode): void {
        this.displayMode = newDisplayMode
    
        this.updateEmbeds()
        this.updateComponents()

        this.updateInteraction(interaction)
    }


    private getAccountFields(): APIEmbedField[] {
        if (!this.account || !this.account.currencies.size) return [{ name: '❌ Account is empty', value: '\u200b' }]
        const fields: APIEmbedField[] = []

        this.account.currencies.forEach(currencyBalance => {
            const emojiString = currencyBalance.item.emoji != null ? `${currencyBalance.item.emoji} ` : ''

            fields.push({ name: `${emojiString}${currencyBalance.item.name}`, value: `${currencyBalance.amount}`, inline: true })
        })

        return fields
    }

    private getInventoryFields(): APIEmbedField[] { 
        if (!this.account || !this.account.inventory.size) return [{ name: '❌ Inventory is empty', value: '\u200b' }]
        const fields: APIEmbedField[] = []

        this.account.inventory.forEach(productBalance => {
            const emojiString = productBalance.item.emoji != null ? `${productBalance.item.emoji} ` : ''

            fields.push({ name: `${emojiString}${productBalance.item.name}`, value: `${productBalance.amount}`, inline: true })
        })

        return fields
    }
}