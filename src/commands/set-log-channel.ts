import fs from 'node:fs/promises'

import { channelMention, ChannelType, ChatInputCommandInteraction, Client, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import settings from '../../data/settings.json'
import { replyErrorMessage, updateAsErrorMessage } from '../utils/utils'
import { ErrorMessages } from '../utils/constants'

const data = new SlashCommandBuilder()
    .setName('set-log-channel')
    .setDescription('Set (or edit) the channel in which logs are sent')
    .addChannelOption(option => option
        .setName('channel')
        .setDescription('The log channel')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)


async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const chosenChannel = interaction.options.getChannel('channel')

    if (chosenChannel ==  null) return await replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)

    settings.logChannelId = chosenChannel.id
    try {
        await fs.writeFile('./data/settings.json', JSON.stringify(settings, null, 4))
        await interaction.reply({ content: `You succesfully set the log channel to ${channelMention(chosenChannel.id)}, re-use this command to change it`, flags: MessageFlags.Ephemeral })
    } catch (error) {
        console.log(error)
        await updateAsErrorMessage(interaction)
    }

}

module.exports = {
    data: data,
    execute: execute
}