const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js")
const fs = require('node:fs/promises')

const config = require('../config/config.json')

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


async function execute(interaction) {
    const chosenChannelID = interaction.options.getChannel('channel').id

    config.logChannelId = chosenChannelID
    try {
        await fs.writeFile('./config/config.json', JSON.stringify(config, null, 4))
        await interaction.reply({ content: `You succesfully set the log channel to <#${chosenChannelID}>, re-use this command to change it`, ephemeral: true })
    } catch (error) {
        console.log(error);
        await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
    }

    
}

module.exports = {
    data: data,
    execute: execute
}