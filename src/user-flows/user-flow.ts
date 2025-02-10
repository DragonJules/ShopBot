import { ChatInputCommandInteraction, MessageComponentInteraction, ModalSubmitInteraction, ButtonBuilder, StringSelectMenuBuilder } from "discord.js"
import { UserInterface, UserInterfaceInteraction } from "../user-interfaces/user-interfaces"


export abstract class UserFlow extends UserInterface {
    public abstract start(interaction: ChatInputCommandInteraction): void 
    protected abstract success(interaction: UserInterfaceInteraction): void
}

