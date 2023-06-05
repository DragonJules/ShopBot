const { SlashCommandBuilder, StringSelectMenuBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, channelMention } = require('discord.js');

const currencies = require('../data/currencies.json')

const data = new SlashCommandBuilder()
    .setName('give')
    .setDescription('Gives money to user')
    .addUserOption(option => option
        .setName('target')
        .setDescription('The user you want to give money')
        .setRequired(true)    
    )
    .addIntegerOption(option => option
        .setName('amount')
        .setDescription('The amount of money to give')
        .setRequired(true)
        .setMaxValue(99999999)
        .setMinValue(1)
    )


async function execute(interaction){
    if (!currencies.length) return await interaction.reply({ content: `There isn't any currency, so you can't give, use \`/create-currency\` to create a new currency`, ephemeral: true })

    const target = interaction.options.getUser('target')
    const amount = interaction.options.getInteger('amount')

    const selectCurrencyMenu = new StringSelectMenuBuilder()
        .setCustomId('select-currency')
        .setPlaceholder('Select a currency')
 
    currencies.forEach(currency => {
        selectCurrencyMenu.addOptions({
            label: currency.name.removeCustomEmojisString().cut(100),
            value: currency.id
        })
    })

    const submitButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-currency-give')
            .setLabel('Submit')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    )


    await interaction.reply({ content: `Give **${amount}** **[Select Currency]** to **${target}**`, components: [new ActionRowBuilder().addComponents(selectCurrencyMenu), submitButton], ephemeral: true })

}

module.exports = {
    data: data,
    execute: execute
}