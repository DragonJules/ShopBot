import { ActionRowBuilder, ButtonBuilder, ChatInputCommandInteraction, ComponentType, EmbedBuilder, InteractionCallbackResponse, InteractionEditReplyOptions, MessageComponentInteraction, ModalSubmitInteraction, RoleSelectMenuBuilder, StringSelectMenuBuilder } from "discord.js"
import { replyErrorMessage, updateAsErrorMessage } from "../utils/utils"
import { ExtendedComponent } from "./extended-components"

export type UserInterfaceInteraction = ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction
export type UserInterfaceComponentBuilder = ButtonBuilder | StringSelectMenuBuilder | RoleSelectMenuBuilder

export abstract class UserInterface {
    public abstract id: string
    protected abstract components: Map<string, ExtendedComponent>

    protected abstract getMessage(): string 
    protected abstract updateComponents(): unknown

    protected abstract initComponents(): unknown

    protected getComponentRows(): ActionRowBuilder<UserInterfaceComponentBuilder>[] {
        const rows: ActionRowBuilder<UserInterfaceComponentBuilder>[] = []

        this.components.forEach((component) => {
            if (component.componentType == ComponentType.Button) {
                if (rows.length == 0) {
                    rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.getComponent()))
                }
                else {
                    const lastRow = rows[rows.length - 1]
                    const lastRowFirstComponentType = lastRow.components[0]?.data.type
        
                    if (lastRowFirstComponentType == ComponentType.StringSelect || lastRowFirstComponentType == ComponentType.RoleSelect) {
                        rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.getComponent()))
                    } else {
                        lastRow.addComponents(component.getComponent())
                    }
                }
            }
            else if (component.componentType == ComponentType.StringSelect || component.componentType == ComponentType.RoleSelect) {
                rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.getComponent()))
            }
        })

        return rows
    }

    protected getInteractionUpdateOptions(): InteractionEditReplyOptions {
        return { content: this.getMessage(), components: this.getComponentRows() }
    }

    protected async updateInteraction(interaction: UserInterfaceInteraction) {
        this.updateComponents()
        if (interaction.deferred) {
            await interaction.editReply(this.getInteractionUpdateOptions())
            return
        }

        try {
            if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) {
                interaction.update(this.getInteractionUpdateOptions())
                return
            }
            interaction.editReply(this.getInteractionUpdateOptions())
        } catch (error) {
            if (interaction.replied) {
                updateAsErrorMessage(interaction)
            }
            else {
                replyErrorMessage(interaction)
            }
        }
    }

    protected createComponentsCollectors(response: InteractionCallbackResponse): void {
        this.components.forEach((component) => {
            component.createCollector(response)
        })
    }

    protected destroyComponentsCollectors(): void {
        this.components.forEach((component) => {
            component.destroyCollector()
        })
    }

    protected disableComponents(): void {
        this.components.forEach((component) => {
            component.toggle(false)
        })
    }
}

export abstract class MessageUserInterface extends UserInterface {
    public abstract display(interaction: UserInterfaceInteraction): void
}

export abstract class EmbedUserInterface extends MessageUserInterface {
    protected abstract embeds: Map<string, EmbedBuilder>

    protected override getInteractionUpdateOptions(): InteractionEditReplyOptions {
        return { content: this.getMessage(), components: this.getComponentRows(), embeds: this.getEmbeds() }
    }

    protected override async updateInteraction(interaction: UserInterfaceInteraction) {
        this.updateEmbeds()
        super.updateInteraction(interaction)
    }

    protected getEmbeds(): EmbedBuilder[] {
        return Array.from(this.embeds.values())
    }

    protected abstract initEmbeds(interaction: UserInterfaceInteraction): void
    protected abstract updateEmbeds(): void

}