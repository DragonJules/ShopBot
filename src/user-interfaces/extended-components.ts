import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelSelectMenuBuilder, ChannelSelectMenuInteraction, ChannelType, ChatInputCommandInteraction, ComponentEmojiResolvable, ComponentType, InteractionCallbackResponse, InteractionCollector, MessageComponentInteraction, MessageComponentType, ModalBuilder, ModalSubmitInteraction, ReadonlyCollection, RoleSelectMenuBuilder, RoleSelectMenuInteraction, Snowflake, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder, UserSelectMenuInteraction } from "discord.js"
import { Currency } from "../database/currencies/currencies-types"
import { isSetting, Setting, Settings } from "../database/settings/settings-types"
import { Product, Shop } from "../database/shops/shops-types"
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
        this.collector = null
    }

    getComponent(): UserInterfaceComponentBuilder {
        return this.component
    }

    toggle(enabled?: boolean) {
        if (enabled == undefined) enabled = !this.component.data.disabled
        this.component.setDisabled(!enabled)
    }
} 

type ExtendButtonOptions = {
    customId: string
    time: number
    style: ButtonStyle
    disabled?: boolean
} & ({
    label: string
    emoji?: ComponentEmojiResolvable
} | {
    label?: string
    emoji: ComponentEmojiResolvable
})


export class ExtendedButtonComponent extends ExtendedComponent {
    componentType = ComponentType.Button
    customId: string
    component: ButtonBuilder
    callback: (interaction: ButtonInteraction) => void
    time: number

    constructor({ customId, time, label, emoji, style, disabled }: ExtendButtonOptions, callback: (interaction: ButtonInteraction) => void) {
        super()
        this.customId = customId
        this.component = new ButtonBuilder()
            .setStyle(style)
            .setDisabled(disabled ?? false)
            .setCustomId(customId)

        if (label) this.component.setLabel(label)
        if (emoji) this.component.setEmoji(emoji)

        this.callback = callback
        this.time = time
    }   

    onCollect(interaction: ButtonInteraction): void {
        this.callback(interaction)
    }

    onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}
}

interface ExtendedSelectMenuOptions {
    customId: string
    placeholder: string
    time: number
}

export class ExtendedStringSelectMenuComponent<T extends Currency | Shop | Product | Setting | string> extends ExtendedComponent {
    componentType = ComponentType.StringSelect
    customId: string
    component: StringSelectMenuBuilder
    map: Map<string, T>
    callback: (interaction: StringSelectMenuInteraction, selected: T) => void
    time: number

    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions, 
        map: Map<string, T>, callback: (interaction: StringSelectMenuInteraction, selected: T) => void
    ) {
        super()
        this.customId = customId
        this.map = map
        this.component = this.createSelectMenu(customId, placeholder, map)

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

    private createSelectMenu(id: string, placeholder: string, map: Map<string, T>): StringSelectMenuBuilder {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder(placeholder)
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

            if (typeof value !== 'string' && !isSetting(value) && value.emoji != '') option.setEmoji(value.emoji)

            options.push(option)
        })
        
        return options
    }

    public updateMap(map: Map<string, T>) {
        this.map = map
        this.component.setOptions(this.getStringSelectOptions(map))
    }
}




type SelectMenuBuilders<T extends MessageComponentType> = 
    T extends ComponentType.RoleSelect ? RoleSelectMenuBuilder : 
    T extends ComponentType.ChannelSelect ? ChannelSelectMenuBuilder :
    T extends ComponentType.UserSelect ? UserSelectMenuBuilder : 
    never

type SelectMenuInteractions<T extends MessageComponentType> = 
    T extends ComponentType.RoleSelect ? RoleSelectMenuInteraction : 
    T extends ComponentType.ChannelSelect ? ChannelSelectMenuInteraction :
    T extends ComponentType.UserSelect ? UserSelectMenuInteraction : 
    never

export abstract class ExtendedSelectMenuComponent<T extends MessageComponentType> extends ExtendedComponent {
    override customId: string
    abstract override component: SelectMenuBuilders<T>

    callback: (interaction: SelectMenuInteractions<T>, selected: Snowflake) => void
    time: number

    constructor({ customId, time }: Omit<ExtendedSelectMenuOptions, 'placeholder'>, 
        callback: (interaction: SelectMenuInteractions<T>, selected: Snowflake) => void
    ) {
        super()
        this.customId = customId
        
        this.callback = callback
        this.time = time
    }

    onCollect(interaction: SelectMenuInteractions<T>): void {
        const selected = interaction.values[0]
        if (selected == undefined) return

        this.callback(interaction, selected)    
    }

    onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}
}

interface ExtendedChannelSelectOptions extends ExtendedSelectMenuOptions {
    channelTypes?: ChannelType[]
}

export class ExtendedChannelSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.ChannelSelect> {
    override componentType = ComponentType.ChannelSelect
    override component: ChannelSelectMenuBuilder
    
    constructor({ customId, placeholder, time, channelTypes }: ExtendedChannelSelectOptions, 
        callback: (interaction: ChannelSelectMenuInteraction, selectedChannelId: Snowflake) => void
    ) {
        super({ customId, time }, callback)

        this.component = new ChannelSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
        
        if (channelTypes) this.component.setChannelTypes(channelTypes)
    }
}

export class ExtendedRoleSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.RoleSelect> {
    override componentType = ComponentType.RoleSelect
    override component: RoleSelectMenuBuilder
    
    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions, 
        callback: (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake) => void
    ) {
        super({ customId, time }, callback)

        this.component = new RoleSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
    }
}


export class ExtendedUserSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.UserSelect> {
    override componentType = ComponentType.UserSelect
    override component: UserSelectMenuBuilder
    
    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions, 
        callback: (interaction: UserSelectMenuInteraction, selectedUserId: Snowflake) => void
    ) {
        super({ customId, time }, callback)

        this.component = new UserSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
    }
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

export type EditModalOptions = {
    edit: string,
    previousValue?: string,
    required?: boolean
    minLength?: number
    maxLength?: number
}

export async function showEditModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    { edit, previousValue, required, minLength, maxLength }: EditModalOptions
): Promise<[ModalSubmitInteraction, string]> {

    const editNormalized = `${edit.toLocaleLowerCase().replaceSpaces('-')}`
    const modalId = `edit-${editNormalized}-modal`

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(`Edit ${edit}`)
    
    const input = new TextInputBuilder()
        .setCustomId(`${editNormalized}-input`)
        .setLabel(`New ${edit}`)
        .setPlaceholder(previousValue ?? edit)
        .setStyle(TextInputStyle.Short)
        .setRequired(required ?? true)
        .setMaxLength(maxLength ?? 120)
        .setMinLength(minLength ?? 0)

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input))

    await interaction.showModal(modal)

    const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
    
    if (!modalSubmit.isFromMessage()) return [modalSubmit, '']
    await modalSubmit.deferUpdate()

    return [modalSubmit, modalSubmit.fields.getTextInputValue(`${editNormalized}-input`)]
}