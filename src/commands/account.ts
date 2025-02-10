import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, MessageFlags, Client, Colors } from "discord.js"
import { getOrCreateAccount } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"
import { AccountUserInterface } from "../user-interfaces/account-ui"

export const data = new SlashCommandBuilder()
    .setName('account')
    .setDescription('Display your account')


export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const accountUI = new AccountUserInterface(interaction.user)
    accountUI.display(interaction)
}
