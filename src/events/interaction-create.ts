

import { BaseInteraction, ChannelType, ChatInputCommandInteraction, InteractionType } from 'discord.js'
import { PrettyLog } from '../utils/pretty-log'
import { replyErrorMessage } from '../utils/utils'

export const name = 'interactionCreate'

export async function execute(interaction: BaseInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) return
    if (interaction.user.bot) return
    
    if (interaction.isChatInputCommand()) {
        handleSlashCommand(interaction)
        return
    }
}


async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
    const command = interaction.client.commands.get(interaction.commandName)
    if (!command) return
    if (interaction?.channel?.type === ChannelType.DM) return
    try {
        await command.execute(interaction.client, interaction)
        PrettyLog.info(`${interaction.user.username} (${interaction.user.id}) in #${interaction?.channel?.name} (${interaction?.channel?.id}) triggered the command '/${interaction.commandName}'`)
    } catch (error: unknown) {
        console.error(error)
        PrettyLog.error(`Failed to execute the command '/${interaction.commandName}' (user: ${interaction.user.username} (${interaction.user.id}) in #${interaction?.channel?.name} (${interaction?.channel?.id}))`)
        
        await replyErrorMessage(interaction)
    }
}
