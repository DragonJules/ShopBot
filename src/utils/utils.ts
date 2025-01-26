import { ChatInputCommandInteraction, MessageFlags } from "discord.js"

export async function replyErrorMessage(interaction: ChatInputCommandInteraction, errorMessage?: string) {
    const message = `❌ ${errorMessage ? errorMessage : 'An error occured while executing this command, please try again later'}`

    return await interaction.reply({ content: message, flags: MessageFlags.Ephemeral })
}


