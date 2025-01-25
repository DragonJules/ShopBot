import fs from 'node:fs/promises'

import { ChannelType, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import config from '../../config/config.json'

const data = new SlashCommandBuilder()
    .setName('set-log-channel')
    .setDescription('Sets (or changes) the channel in which logs are sent')
    .addChannelOption(option => option
        .setName('channel')
        .setDescription('The log channel')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)


async function execute(interaction: ChatInputCommandInteraction) {
    const chosenChannel = interaction.options.getChannel('channel')

    if (chosenChannel ==  null) return await interaction.reply({ content: '❌ An error has occured while executing this command, try again later', components: [] })

    config.logChannelId = chosenChannel.id
    try {
        await fs.writeFile('./config/config.json', JSON.stringify(config, null, 4))
        await interaction.reply({ content: `You succesfully set the log channel to <#${chosenChannel.id}>, re-use this command to change it`, flags: MessageFlags.Ephemeral })
    } catch (error) {
        console.log(error)
        await interaction.editReply({ content: '❌ An error has occured while executing this command, try again later', components: [] })
    }

}

module.exports = {
    data: data,
    execute: execute
}