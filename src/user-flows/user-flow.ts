import { ActionRowBuilder, ChatInputCommandInteraction, ButtonBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ComponentType, InteractionCallbackResponse, MessageComponentType, MessageComponentInteraction, ReadonlyCollection, StringSelectMenuInteraction, ButtonInteraction } from "discord.js";
import { Currency, Shop } from "../database/database-types";
import { getCurrencies } from "../database/database-handler";

export type UserFlowInteraction = ChatInputCommandInteraction | MessageComponentInteraction
export type UserFlowComponentBuilder = ButtonBuilder | StringSelectMenuBuilder

export abstract class UserFlow {
    abstract id: string
    protected abstract components: Map<string, ExtendedComponent>

    public abstract start(interaction: ChatInputCommandInteraction): void 

    protected abstract initComponents(): void

    protected abstract getMessage(): string 
    protected abstract updateComponents(): void
    protected getComponentRows(): ActionRowBuilder<UserFlowComponentBuilder>[] {
        const rows: ActionRowBuilder<UserFlowComponentBuilder>[] = []

        this.components.forEach((component) => {
            if (component.componentType == ComponentType.Button) {
                if (rows.length == 0) {
                    rows.push(new ActionRowBuilder<UserFlowComponentBuilder>().addComponents(component.getComponent()))
                }
                else {
                    if (rows[rows.length - 1].components[0]?.data.type == ComponentType.StringSelect) {
                        rows.push(new ActionRowBuilder<UserFlowComponentBuilder>().addComponents(component.getComponent()))
                    } else {
                        rows[rows.length - 1].addComponents(component.getComponent())
                    }
                }
            }
            else if (component.componentType == ComponentType.StringSelect) {
                rows.push(new ActionRowBuilder<UserFlowComponentBuilder>().addComponents(component.getComponent()))
            }
        })

        return rows
    }

    protected async updateInteraction(interaction: UserFlowInteraction) {
        this.updateComponents()
        if (interaction.isMessageComponent()) {
            interaction.update({ content: this.getMessage(), components: this.getComponentRows() })
            return
        }
        interaction.editReply({ content: this.getMessage(), components: this.getComponentRows() })
    }

    protected createComponentsCollectors(response: InteractionCallbackResponse): void {
        this.components.forEach((component) => {
            component.createCollector(response)
        })
    }

    protected abstract success(interaction: UserFlowInteraction): void
}

export abstract class ExtendedComponent {
    abstract componentType: ComponentType
    abstract customId: string
    protected abstract component: UserFlowComponentBuilder
    protected abstract callback: (...args: any[]) => void
    abstract time: number

    protected abstract onCollect(interaction: MessageComponentInteraction): void
    protected abstract onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void

    public createCollector(response: InteractionCallbackResponse) {
        const filter = (interaction: MessageComponentInteraction) => interaction.customId === this.customId
        const collector = response.resource?.message?.createMessageComponentCollector({ componentType: this.componentType as MessageComponentType, time: this.time, filter })

        if (collector == undefined) return

        collector.on('collect', (interaction) => this.onCollect(interaction))
        collector.on('end', (collected) => this.onEnd(collected))
    }

    getComponent(): UserFlowComponentBuilder {
        return this.component
    }
} 

export class ExtendedButtonComponent extends ExtendedComponent {
    componentType = ComponentType.Button
    customId: string
    component: ButtonBuilder
    callback: (interaction: ButtonInteraction) => void
    time: number

    constructor(customId: string, button: ButtonBuilder, callback: (interaction: ButtonInteraction) => void, time: number) {
        super()
        this.customId = customId
        this.component = button.setCustomId(customId)

        this.callback = callback
        this.time = time
    }   

    onCollect(interaction: ButtonInteraction): void {
        this.callback(interaction)
    }

    onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void {
        
    }

    toggle(enabled?: boolean) {
        if (enabled == undefined) enabled = !this.component.data.disabled
        this.component.setDisabled(!enabled)
    }
}

export class ExtendedStringSelectMenuComponent extends ExtendedComponent {
    componentType = ComponentType.StringSelect
    customId: string
    component: StringSelectMenuBuilder
    callback: (interaction: StringSelectMenuInteraction, selectedCurrency: Currency) => void
    time: number

    constructor(customId: string, label: string, map: Map<string, Currency | Shop>, callback: (interaction: StringSelectMenuInteraction, selectedCurrency: Currency) => void, time: number) {
        super()
        this.customId = customId
        this.component = this.createSelectMenu(customId, label, map)

        this.callback = callback
        this.time = time
    }

    onCollect(interaction: StringSelectMenuInteraction): void {
        if (!interaction.isStringSelectMenu()) return

        const currency = getCurrencies().get(interaction.values[0])
        if (currency == undefined) return

        this.callback(interaction, currency)
    }

    onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void {
        
    }

    private createSelectMenu(id: string, label: string, map: Map<string, Currency | Shop>): StringSelectMenuBuilder {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder(label)
            .addOptions(this.getStringSelectOptions(map))
    
        return selectMenu
    }

    private getStringSelectOptions(map: Map<string, Currency | Shop>): StringSelectMenuOptionBuilder[] {
        const options: StringSelectMenuOptionBuilder[] = []
        map.forEach(value => {
            options.push(new StringSelectMenuOptionBuilder()
                .setLabel(value.name.removeCustomEmojis().ellipsis(100))
                .setValue(value.id)
            )
        })
        
        return options
    }
}
