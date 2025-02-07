import { ChatInputCommandInteraction, MessageFlags, User } from "discord.js"
import { UserFlowInteraction } from "../user-flows/user-flow"

export async function replyErrorMessage(interaction: UserFlowInteraction, errorMessage?: string) {
    return await interaction.reply({ content: getErrorMessage(errorMessage), flags: MessageFlags.Ephemeral })
}

export async function updateAsErrorMessage(interaction: UserFlowInteraction, errorMessage?: string) {
    const message = getErrorMessage(errorMessage)

    if (interaction.isMessageComponent()) return await interaction.update({ content: message, components: [] })
    return await interaction.editReply({ content: message, components: [] })
}

export async function replySuccessMessage(interaction: UserFlowInteraction, succesMessage: string) {
    return await interaction.reply({ content: getSuccessMessage(succesMessage), flags: MessageFlags.Ephemeral })
}

export async function updateAsSuccessMessage(interaction: UserFlowInteraction, succesMessage: string) {
    const message = getSuccessMessage(succesMessage)

    if (interaction.isMessageComponent()) return await interaction.update({ content: message, components: [] })
    return await interaction.editReply({ content: message, components: [] })
}



function getErrorMessage(errorMessage?: string) {
    return `❌ ${errorMessage ? errorMessage : 'An error occured while executing this command, please try again later'}`
}

function getSuccessMessage(succesMessage: string) {
    return `✅ ${succesMessage}`
}