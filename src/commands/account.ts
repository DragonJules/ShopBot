import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js"
import { AccountUserInterface } from "../user-interfaces/account-ui"

export const data = new SlashCommandBuilder()
    .setName('account')
    .setDescription('Display your account')


export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const accountUI = new AccountUserInterface(interaction.user)
    accountUI.display(interaction)
}
