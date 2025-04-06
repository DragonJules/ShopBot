import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ChatInputCommandInteraction, ComponentType, InteractionCallbackResponse, InteractionCollector, MessageComponentInteraction, MessageComponentType, ModalBuilder, ModalSubmitInteraction, ReadonlyCollection, Role, RoleSelectMenuBuilder, RoleSelectMenuInteraction, Snowflake, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import { Currency, Product, Shop } from "../database/database-types"
import { UserInterfaceComponentBuilder } from "./user-interfaces"

export abstract class ExtendedComponent {
    abstract componentType: ComponentType
    abstract customId: string
    protected abstract component: UserInterfaceComponentBuilder
    protected abstract callback: (...args: any[]) => void
    abstract time: number

    protected collector: InteractionCollector<ButtonInteraction | StringSelectMenuInteraction> | null = null

    protected abstract onCollect(interaction: MessageComponentInteraction): void
    protected abstract onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void

    public createCollector(response: InteractionCallbackResponse) {
        const filter = (interaction: MessageComponentInteraction) => interaction.customId === this.customId
        const collector = response.resource?.message?.createMessageComponentCollector({ componentType: this.componentType as MessageComponentType, time: this.time, filter })

        this.collector = collector as InteractionCollector<ButtonInteraction | StringSelectMenuInteraction>

        if (collector == undefined) return

        collector.on('collect', (interaction) => this.onCollect(interaction))
        collector.on('end', (collected) => this.onEnd(collected))
    }

    public destroyCollector() {
        if (this.collector == null) return

        this.collector.stop()
    }

    getComponent(): UserInterfaceComponentBuilder {
        return this.component
    }

    toggle(enabled?: boolean) {
        if (enabled == undefined) enabled = !this.component.data.disabled
        this.component.setDisabled(!enabled)
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

    onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}
}

export class ExtendedStringSelectMenuComponent<T extends Currency | Shop | Product | string> extends ExtendedComponent {
    componentType = ComponentType.StringSelect
    customId: string
    component: StringSelectMenuBuilder
    map: Map<string, T>
    callback: (interaction: StringSelectMenuInteraction, selected: T) => void
    time: number

    constructor(customId: string, label: string, map: Map<string, T>, callback: (interaction: StringSelectMenuInteraction, selected: T) => void, time: number) {
        super()
        this.customId = customId
        this.map = map
        this.component = this.createSelectMenu(customId, label, map)

        this.callback = callback
        this.time = time
    }

    onCollect(interaction: StringSelectMenuInteraction): void {
        if (!interaction.isStringSelectMenu()) return

        const selected = this.map.get(interaction.values[0])
        if (selected == undefined) return

        this.callback(interaction, selected)    
    }

    onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}

    private createSelectMenu(id: string, label: string, map: Map<string, T>): StringSelectMenuBuilder {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder(label)
            .addOptions(this.getStringSelectOptions(map))
    
        return selectMenu
    }

    private getStringSelectOptions(map: Map<string, T>): StringSelectMenuOptionBuilder[] {
        const options: StringSelectMenuOptionBuilder[] = []
        map.forEach((value, key) => {
            const label = (typeof value === 'string') ? value : value.name.removeCustomEmojis().ellipsis(100)

            const option = new StringSelectMenuOptionBuilder()
                .setLabel(label)
                .setValue(key)

            if (typeof value !== 'string' && value.emoji != '') option.setEmoji(value.emoji)

            options.push(option)
        })
        
        return options
    }

    public updateMap(map: Map<string, T>) {
        this.map = map
        this.component.setOptions(this.getStringSelectOptions(map))
    }
}

export class ExtendedRoleSelectMenuComponent extends ExtendedComponent {
    componentType = ComponentType.RoleSelect
    customId: string
    component: RoleSelectMenuBuilder

    callback: (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake) => void
    time: number
    
    constructor(customId: string, label: string, callback: (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake) => void, time: number) {
        super()
        this.customId = customId
        this.component = new RoleSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(label)
        
        this.callback = callback
        this.time = time
    }

    onCollect(interaction: RoleSelectMenuInteraction): void {
        if (!interaction.isRoleSelectMenu()) return

        const selected = interaction.values[0]
        if (selected == undefined) return

        this.callback(interaction, selected)    
    }

    onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}
}

export async function showConfirmationModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction): Promise<[ModalSubmitInteraction, boolean]> {
    const modalId = 'confirmation-modal'

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('⚠️ Are you sure?')

    const confirmationInput = new TextInputBuilder()
        .setCustomId('confirm-empty-input')
        .setLabel('This action can\'t be undone')
        .setPlaceholder('Enter \'Yes\' to confirm')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(confirmationInput))

    await interaction.showModal(modal)

    const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
    
    if (!modalSubmit.isFromMessage()) return [modalSubmit, false]
    await modalSubmit.deferUpdate()

    return [modalSubmit, modalSubmit.fields.getTextInputValue('confirm-empty-input').toLowerCase().substring(0, 3) == 'yes']
}

export async function showEditModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction, edit: string, previousValue?: string): Promise<[ModalSubmitInteraction, string]> {
    const editNormalized = `${edit.toLocaleLowerCase().replaceSpaces('-')}`
    const modalId = `edit-${editNormalized}-modal`

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(`Edit ${edit}`)
    
    const input = new TextInputBuilder()
        .setCustomId(`${editNormalized}-input`)
        .setLabel(`New ${edit}`)
        .setPlaceholder(previousValue || edit)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(120)
        .setMinLength(1)

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input))

    await interaction.showModal(modal)

    const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
    
    if (!modalSubmit.isFromMessage()) return [modalSubmit, '']
    await modalSubmit.deferUpdate()

    return [modalSubmit, modalSubmit.fields.getTextInputValue(`${editNormalized}-input`)]
}