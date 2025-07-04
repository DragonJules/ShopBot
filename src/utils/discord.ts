import { MessageFlags, TextChannel } from "discord.js"
import { getSettings } from "../database/settings/settings-handler"
import { UserInterfaceInteraction } from "../user-interfaces/user-interfaces"
import { ErrorMessages } from "./constants"
import { PrettyLog } from "./pretty-log"

export async function replyErrorMessage(interaction: UserInterfaceInteraction, errorMessage?: string | ErrorMessages) {
    return await interaction.reply({ content: getErrorMessage(errorMessage as string), flags: MessageFlags.Ephemeral })
}

export async function updateAsErrorMessage(interaction: UserInterfaceInteraction, errorMessage?: string | ErrorMessages) {
    const message = getErrorMessage(errorMessage as string)

    if (interaction.deferred) return await interaction.editReply({ content: message, components: [] })
    if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) return await interaction.update({ content: message, components: [] })
    return await interaction.editReply({ content: message, components: [] })
}

export async function replySuccessMessage(interaction: UserInterfaceInteraction, succesMessage: string) {
    return await interaction.reply({ content: getSuccessMessage(succesMessage), flags: MessageFlags.Ephemeral })
}

export async function updateAsSuccessMessage(interaction: UserInterfaceInteraction, succesMessage: string) {
    const message = getSuccessMessage(succesMessage)

    if (interaction.deferred) return await interaction.editReply({ content: message, components: [] })
    if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) return await interaction.update({ content: message, components: [] })
    return await interaction.editReply({ content: message, components: [] })
}



function getErrorMessage(errorMessage?: string) {
    return `❌ ${errorMessage ? errorMessage : 'An error occured while executing this command, please try again later'}`
}

function getSuccessMessage(succesMessage: string) {
    return `✅ ${succesMessage}`
}

export async function logToDiscord(interaction: UserInterfaceInteraction, message: string) {
    PrettyLog.info(`Logged to Discord: ${message}`)
    
    try {
        const logChannelSetting = getSettings().get('logChannelId')
        if (!logChannelSetting?.value || logChannelSetting.type !== 'channelId') return
        const logChannel = await interaction.guild?.channels.fetch(logChannelSetting.value)
        if (!(logChannel instanceof TextChannel)) return

        await logChannel.send(message)
    } catch (error) {
        PrettyLog.error(`Failed to log to Discord: ${error}`)
    }
}
