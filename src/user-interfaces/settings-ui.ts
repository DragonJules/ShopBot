import { APIEmbedField, ButtonStyle, channelMention, ChannelSelectMenuInteraction, ChannelType, Colors, EmbedBuilder, InteractionCallbackResponse, MessageComponentInteraction, roleMention, RoleSelectMenuInteraction, Snowflake, StringSelectMenuInteraction, userMention, UserSelectMenuInteraction } from "discord.js"
import { getSettings, setSetting } from "../database/settings/settings-handler"
import { Setting } from "../database/settings/settings-types"
import { assertNeverReached, toStringOrUndefined } from "../utils/utils"
import { ExtendedButtonComponent, ExtendedChannelSelectMenuComponent, ExtendedComponent, ExtendedRoleSelectMenuComponent, ExtendedStringSelectMenuComponent, ExtendedUserSelectMenuComponent, showEditModal } from "./extended-components"
import { PaginatedEmbedUserInterface, UserInterfaceInteraction } from "./user-interfaces"


export class SettingsInterface extends PaginatedEmbedUserInterface {
    public override id = 'settings-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()
    protected override embed: EmbedBuilder | null = null

    protected response: InteractionCallbackResponse | null = null

    private selectedSetting: Setting | null = null

    protected override page = 0

    protected override readonly MAX_FIELDS_PER_PAGE = 12

    protected override getMessage(): string {
        return ''
    }

    protected override getInputSize(): number {
        return getSettings().size
    }

    protected override initComponents(): unknown {
        const settingSelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: 'settings-select-menu', placeholder: 'Edit a setting', time: 120_000 }, 
            getSettings(), 
            (interaction: StringSelectMenuInteraction, selected: Setting) => {
                this.selectedSetting = selected
                this.updateInteraction(interaction)
            }
        )

        this.components.set('settings-select-menu', settingSelectMenu)
        return
    }

    protected override updateComponents(): unknown {
        this.destroyComponentsCollectors()
        this.clearEditComponents()

        if (!this.selectedSetting) {
            if (this.response) this.createComponentsCollectors(this.response)
            return
        }

        const settingEditorComponents = this.getSettingEditorComponents(this.selectedSetting)

        for (const component of settingEditorComponents) {
            this.components.set(component.customId, component)
        }

        if (!this.response) return
        this.createComponentsCollectors(this.response)

        return
    }

    protected override initEmbeds(interaction: UserInterfaceInteraction) {
        const settingsEmbed = new EmbedBuilder()
            .setTitle('⚙️ Settings')
            .setDescription('You can edit your settings here')
            .setColor(Colors.DarkButNotBlack)

        settingsEmbed.addFields(this.getPageEmbedFields())

        this.embed = settingsEmbed
    }

    protected override updateEmbeds() {
        if (!this.embed) return

        this.embed.setFields(this.getPageEmbedFields())
    }

    protected getEmbedFields(): APIEmbedField[] {
        const settings = getSettings()

        const fields: APIEmbedField[] = []

        settings.forEach(setting => {
            const { name, type, value } = setting

            if (value === undefined || value === "") {
                fields.push({ name, value: "Not set", inline: true })
                return
            }

            const displayValue = 
                type === 'string' ? value : 
                type === 'bool' ? (value ? '✅' : '❌') :
                type === 'number' ? `${value}` :
                type === 'channelId' ? channelMention(value) :
                type === 'roleId' ? roleMention(value) :
                type === 'userId' ? userMention(value) :
                assertNeverReached(type)

            fields.push({ name, value: displayValue, inline: true })
        })

        return fields
    }

    private getSettingEditorComponents(setting: Setting): ExtendedComponent[] {
        let components: ExtendedComponent[] = []

        switch (setting.type) {
            case 'string':
                const showStringEditModalButton = new ExtendedButtonComponent(
                    {
                        customId: 'edit-setting+string',
                        label: `Edit ${setting.name}`,
                        emoji: '📝',
                        style: ButtonStyle.Primary,
                        time: 120000
                    },
                    async (interaction: MessageComponentInteraction) => {
                        const [modalSubmit, newValue] = await showEditModal(interaction, { edit: setting.name, previousValue: setting.value })
                        this.selectedSetting = await setSetting(setting.id, newValue)
                        this.updateInteraction(modalSubmit)
                    }
                )

                components.push(showStringEditModalButton)
                break

            case 'bool':
                const toggleButton = new ExtendedButtonComponent(
                    {
                        customId: 'edit-setting+bool',
                        label: `${setting.value ? 'Disable' : 'Enable'} ${setting.name}`,
                        emoji: setting.value ? '✖️' : '✅',
                        style: setting.value ? ButtonStyle.Danger : ButtonStyle.Success,
                        time: 120_000
                    },
                    async (interaction: MessageComponentInteraction) => {
                        this.selectedSetting = await setSetting(setting.id, !setting.value)
                        this.updateInteraction(interaction)
                    }
                )

                components.push(toggleButton)
                break

            case 'number':
                const showNumberEditModalButton = new ExtendedButtonComponent(
                    {
                        customId: 'edit-setting+number',
                        label: `Edit ${setting.name}`,
                        emoji: '📝',
                        style: ButtonStyle.Primary,
                        time: 120_000
                    }, 
                    async (interaction: MessageComponentInteraction) => {
                        const [modalSubmit, newValue] = await showEditModal(interaction, { edit: setting.name, previousValue: toStringOrUndefined(setting.value) })

                        if (!newValue && newValue == "") return this.updateInteraction(interaction)
                        const newValueAsNumber = Number(newValue)
                        if (isNaN(newValueAsNumber)) return this.updateInteraction(interaction)
                        
                        this.selectedSetting = await setSetting(setting.id, newValue)
                        this.updateInteraction(modalSubmit)
                    }
                )

                components.push(showNumberEditModalButton)
                break

            case 'channelId':
                const channelSelectMenu = new ExtendedChannelSelectMenuComponent(
                    { 
                        customId: 'edit-setting+channel', 
                        placeholder: `Select a channel for ${setting.name}`, 
                        time: 120_000,
                        channelTypes: [ChannelType.GuildText]
                    }, async (interaction: ChannelSelectMenuInteraction, selectedChannelId: Snowflake) => {
                        this.selectedSetting = await setSetting(setting.id, selectedChannelId)
                        this.updateInteraction(interaction)
                    }
                )
            
                components.push(channelSelectMenu)
                break

            case 'roleId':
                const roleSelectMenu = new ExtendedRoleSelectMenuComponent(
                    { 
                        customId: 'edit-setting+role', 
                        placeholder: `Select a role for ${setting.name}`, 
                        time: 120_000 
                    }, async (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake) => {
                        this.selectedSetting = await setSetting(setting.id, selectedRoleId)
                        this.updateInteraction(interaction)
                    }
                )
            
                components.push(roleSelectMenu)
                break

            case 'userId':
                const userSelectMenu = new ExtendedUserSelectMenuComponent(
                    { 
                        customId: 'edit-setting+user', 
                        placeholder: `Select a user for ${setting.name}`, 
                        time: 120_000 
                    }, async (interaction: UserSelectMenuInteraction, selectedUserId: Snowflake) => {
                        this.selectedSetting = await setSetting(setting.id, selectedUserId)
                        this.updateInteraction(interaction)
                    }
                )
            
                components.push(userSelectMenu)
                break

            default:
                assertNeverReached(setting)
        }

        
        const resetSettingButton = new ExtendedButtonComponent(
            {
                customId: 'edit-setting+reset-button',
                label: `Reset ${setting.name}`,
                emoji: '🗑️',
                style: ButtonStyle.Danger,
                time: 120_000
            },
            async (interaction: MessageComponentInteraction) => {
                this.selectedSetting = await setSetting(setting.id, undefined)
                this.updateInteraction(interaction)
            }
        )

        const returnButton = new ExtendedButtonComponent(
            {
                customId: 'edit-setting+return-button',
                label: 'Return',
                emoji: '⬅️',
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: MessageComponentInteraction) => {
                this.selectedSetting = null
                this.updateInteraction(interaction)
            }
        )

        components.push(resetSettingButton)
        components.push(returnButton)

        return components
    }

    private clearEditComponents(): void {
        const editSettingsComponentsIds = [...this.components.keys()].filter(id => id.startsWith('edit-setting'))
        if (editSettingsComponentsIds.length === 0) return
        for (const id of editSettingsComponentsIds) {
            this.components.delete(id)
        }
    }
}
