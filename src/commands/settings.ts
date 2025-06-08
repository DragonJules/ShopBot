import { SlashCommandBuilder, Client, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"
import { SettingsInterface } from "../user-interfaces/settings-ui"

export const data = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('See and edit your settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)


export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const settingsInterface = new SettingsInterface()
    await settingsInterface.display(interaction)
}
