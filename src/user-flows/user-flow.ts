import { ActionRowBuilder, ChatInputCommandInteraction, ButtonBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ComponentType, InteractionCallbackResponse, MessageComponentType, MessageComponentInteraction, ReadonlyCollection } from "discord.js";
import { Currency, Shop } from "../database/database-types";
import { get } from "node:http";

type UserFlowInteraction = ChatInputCommandInteraction | MessageComponentInteraction
export type UserFlowComponentBuilder = ButtonBuilder | StringSelectMenuBuilder

export abstract class UserFlow {
    abstract id: string
    protected abstract components: Map<string, ExtendedComponent>

    public abstract start(interaction: ChatInputCommandInteraction): void 

    protected abstract initComponents(): void

    protected abstract getMessage(): string 
    protected abstract updateComponents(): void
    protected getComponents(): ActionRowBuilder<UserFlowComponentBuilder>[] {
        const rows: ActionRowBuilder<UserFlowComponentBuilder>[] = []

        for (const id in this.components.values()) {
            const component = this.components.get(id)
            if (!component) continue
            rows.push(component.getRow())
        }

        return rows
    }

    protected updateInteraction(interaction: UserFlowInteraction) {
        this.updateComponents()
        interaction.editReply({ content: this.getMessage(), components: this.getComponents() })
    }
}

export abstract class ExtendedComponent {
    abstract componentType: MessageComponentType
    abstract customId: string
    protected abstract component: ActionRowBuilder<UserFlowComponentBuilder>
    protected abstract callback: (...args: any[]) => void
    abstract time: number

    protected abstract onCollect(interaction: MessageComponentInteraction): void
    protected abstract onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void

    protected createCollector(response: InteractionCallbackResponse) {
        const filter = (interaction: MessageComponentInteraction) => interaction.customId === this.customId
        const collector = response.resource?.message?.createMessageComponentCollector({ componentType: this.componentType, time: this.time, filter })

        if (!collector) return

        collector.on('collect', this.onCollect)
        collector.on('end', this.onEnd)
    }

    getRow(): ActionRowBuilder<UserFlowComponentBuilder> {
        return this.component
    }
} 

export class ExtendedButtonComponent extends ExtendedComponent {
    componentType = ComponentType.Button as MessageComponentType
    customId: string
    component: ActionRowBuilder<ButtonBuilder>
    callback: (interaction: UserFlowInteraction) => void
    time: number

    constructor(customId: string, button: ButtonBuilder, callback: (interaction: UserFlowInteraction) => void, time: number) {
        super()
        this.customId = customId
        this.component = new ActionRowBuilder<ButtonBuilder>().addComponents(button.setCustomId(customId))

        this.callback = callback
        this.time = time
    }   

    onCollect(interaction: MessageComponentInteraction): void {
        this.callback(interaction)
    }

    onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void {
        
    }

    toggle(enabled?: boolean) {
        if (enabled == undefined) enabled = !this.component.components[0].data.disabled
        this.component.components[0].setDisabled(!enabled)
    }
}

export class ExtendedStringSelectMenuComponent extends ExtendedComponent {
    componentType = ComponentType.StringSelect as MessageComponentType
    customId: string
    component: ActionRowBuilder<StringSelectMenuBuilder>
    callback: (...args: any[]) => void
    time: number

    constructor(customId: string, label: string, map: Map<string, Currency | Shop>, callback: (...args: any[]) => void, time: number) {
        super()
        this.customId = customId
        this.component = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(this.createSelectMenu(customId, label, map))

        this.callback = callback
        this.time = time
    }

    onCollect(interaction: MessageComponentInteraction): void {
        this.callback(interaction)
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
