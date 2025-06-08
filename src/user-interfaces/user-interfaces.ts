import { ActionRowBuilder, APIEmbedField, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelSelectMenuBuilder, ChatInputCommandInteraction, ComponentType, EmbedBuilder, InteractionCallbackResponse, InteractionEditReplyOptions, MessageComponentInteraction, MessageFlags, ModalSubmitInteraction, RoleSelectMenuBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder } from "discord.js"
import { replyErrorMessage, updateAsErrorMessage } from "../utils/discord"
import { ExtendedButtonComponent, ExtendedComponent } from "./extended-components"

export type UserInterfaceInteraction = ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction
export type UserInterfaceComponentBuilder = ButtonBuilder | StringSelectMenuBuilder | RoleSelectMenuBuilder | ChannelSelectMenuBuilder | UserSelectMenuBuilder

const selectMenuComponents = [ComponentType.MentionableSelect, ComponentType.StringSelect, ComponentType.RoleSelect, ComponentType.UserSelect, ComponentType.ChannelSelect]

export abstract class UserInterface {
    public abstract id: string
    protected abstract components: Map<string, ExtendedComponent>

    protected abstract getMessage(): string 
    protected abstract updateComponents(): unknown

    protected abstract initComponents(): unknown

    protected getComponentRows(): ActionRowBuilder<UserInterfaceComponentBuilder>[] {
        const rows: ActionRowBuilder<UserInterfaceComponentBuilder>[] = []
        const paginationRow = new ActionRowBuilder<UserInterfaceComponentBuilder>()

        this.components.forEach((component) => {
            if (component.customId.endsWith('page')) {
                paginationRow.addComponents(component.getComponent())
            }
            else if (component.componentType == ComponentType.Button) {
                if (rows.length == 0) {
                    rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.getComponent()))
                }
                else {
                    const lastRow = rows[rows.length - 1]
                    const lastRowFirstComponentType = lastRow.components[0]?.data.type
        
                    if (lastRowFirstComponentType && selectMenuComponents.includes(lastRowFirstComponentType)) {
                        rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.getComponent()))
                    } else {
                        lastRow.addComponents(component.getComponent())
                    }
                }
            }
            else if (selectMenuComponents.includes(component.componentType)) {
                rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.getComponent()))
            }
        })

        if (paginationRow.components.length > 0) {
            rows.push(paginationRow)
        }

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
    protected async predisplay(interaction: UserInterfaceInteraction): Promise<any> {}

    protected setup(_interaction: UserInterfaceInteraction): void {
        this.initComponents()
        this.updateComponents()
    }

    public async display(interaction: UserInterfaceInteraction) {
        await this.predisplay(interaction)

        this.setup(interaction)

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        return
    }
}

export abstract class EmbedUserInterface extends MessageUserInterface {
    protected abstract embed: EmbedBuilder | null

    protected override setup(interaction: UserInterfaceInteraction): void {
        this.initComponents()
        this.initEmbeds(interaction)

        this.updateComponents()
        this.updateEmbeds()
    }

    protected reset() {}

    public override async display(interaction: UserInterfaceInteraction) {
        await this.predisplay(interaction)

        this.setup(interaction)

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), embeds: this.getEmbeds(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        return
    }

    protected override getInteractionUpdateOptions(): InteractionEditReplyOptions {
        return { content: this.getMessage(), components: this.getComponentRows(), embeds: this.getEmbeds() }
    }

    protected override async updateInteraction(interaction: UserInterfaceInteraction) {
        this.updateEmbeds()
        super.updateInteraction(interaction)
    }

    protected getEmbeds(): EmbedBuilder[] {
        return this.embed ? [this.embed] : []
    }

    protected abstract getEmbedFields(): APIEmbedField[] 

    protected abstract initEmbeds(interaction: UserInterfaceInteraction): void
    protected abstract updateEmbeds(): void
}

type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T

function Paginated<TBase extends AbstractConstructor<EmbedUserInterface>>(Base: TBase) {
    abstract class Paginated extends Base {
        protected MAX_FIELDS_PER_PAGE = 9

        protected abstract page: number

        protected abstract response: InteractionCallbackResponse | null

        protected override setup(interaction: UserInterfaceInteraction): void {
            super.setup(interaction)
            this.paginationUpdate()
        }

        protected override reset(): void {
            super.reset()
            this.page = 0
        }

        public override async display(interaction: UserInterfaceInteraction): Promise<void> {
            await this.predisplay(interaction)
            this.setup(interaction)

            const response = await interaction.reply({ embeds: this.getEmbeds(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
            this.createComponentsCollectors(response)

            this.response = response

            return
        }

        protected override async updateInteraction(interaction: UserInterfaceInteraction) {
            this.paginationUpdate()
            super.updateInteraction(interaction)
        }

        protected getPaginationButtons(): ExtendedButtonComponent[] {
            return [
                new ExtendedButtonComponent({
                    customId: `${this.id}+previous-page`,
                    time: 120_000,
                    emoji: '⬅️',
                    style: ButtonStyle.Secondary,
                }, (interaction: ButtonInteraction) => this.previousPage(interaction)),
                new ExtendedButtonComponent({
                    customId: `${this.id}+next-page`,
                    time: 120_000,
                    emoji: {name: '➡️'},
                    style: ButtonStyle.Secondary,
                }, (interaction: ButtonInteraction) => this.nextPage(interaction))
            ]
        }

        protected getPageEmbedFields(): APIEmbedField[] {
            return this.getEmbedFields().slice(this.page * this.MAX_FIELDS_PER_PAGE, (this.page + 1) * this.MAX_FIELDS_PER_PAGE)
        }

        protected abstract getInputSize(): number

        private paginationUpdate() {
            const pageCount = this.getPageCount()

            if (this.embed) {
                if (pageCount > 1) {
                    this.embed.setFooter({ text: `Page ${this.page + 1}/${pageCount}` })
                } else {
                    this.embed.setFooter(null)
                }

                this.embed.setFields(this.getPageEmbedFields())
            }

            const paginationButtons = this.getPaginationButtons()

            if (pageCount > 1) {
                if (this.response) {
                    this.destroyComponentsCollectors()
                }
                
                paginationButtons[0].toggle(this.page > 0)
                paginationButtons[1].toggle(this.page < pageCount - 1)

                this.components.set(paginationButtons[0].customId, paginationButtons[0])
                this.components.set(paginationButtons[1].customId, paginationButtons[1])

                if (this.response) {
                    this.createComponentsCollectors(this.response)
                }
            }
            else {
                if (this.response) {
                    this.destroyComponentsCollectors()
                }
                
                this.components.delete(paginationButtons[0].customId)
                this.components.delete(paginationButtons[1].customId)

                if (this.response) {
                    this.createComponentsCollectors(this.response)
                }
            }
        }

        private previousPage(interaction: ButtonInteraction) {
            if (this.page == 0) return this.updateInteraction(interaction)

            this.page -= 1
            return this.updateInteraction(interaction)   
        }

        private nextPage(interaction: ButtonInteraction) {
            const pageCount = this.getPageCount()

            if (this.page == pageCount - 1) return this.updateInteraction(interaction)

            this.page += 1
            return this.updateInteraction(interaction)
        }

        getPageCount(): number {
            return Math.max(Math.ceil(this.getInputSize() / this.MAX_FIELDS_PER_PAGE), 1)
        }
    }
    return Paginated
}

export type ObjectValues<T> = T[keyof T]

function Multiple<TBase extends AbstractConstructor<EmbedUserInterface>>(Base: TBase) {
    abstract class Multiple extends Base {
        protected abstract readonly modes: {
            [key: string]: string
        }
        
        protected abstract mode: ObjectValues<typeof this.modes>

        protected abstract embedByMode: Map<ObjectValues<typeof this.modes>, EmbedBuilder>

        protected changeDisplayMode(interaction: UserInterfaceInteraction, newMode: ObjectValues<typeof this.modes>): void {
            this.mode = newMode
            this.reset()
        
            if (!this.embedByMode.has(this.mode)) throw new Error(`No embed for mode ${this.mode}`)
            this.embed = this.embedByMode.get(this.mode)!

            this.embed.setFields(this.getEmbedFields())

            this.updateEmbeds()
            this.updateComponents()

            this.updateInteraction(interaction)
        }

        protected override setup(interaction: UserInterfaceInteraction): void {
            super.setup(interaction)
            if (!this.mode) {
                this.mode = this.modes[Object.keys(this.modes)[0]]
            }
        }

    }

    return Multiple
}


export const PaginatedEmbedUserInterface = Paginated(EmbedUserInterface)

export const MultipleEmbedUserInterface = Multiple(EmbedUserInterface)

export const PaginatedMultipleEmbedUserInterface = Paginated(Multiple(EmbedUserInterface))
