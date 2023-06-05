const { SlashCommandBuilder, StringSelectMenuBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');


const currencies = require('../data/currencies.json')

const data = new SlashCommandBuilder()
    .setName('take')
    .setDescription('Takes money from the user\'s inventory')
    .addUserOption(option => option
        .setName('target')
        .setDescription('The user you want to take money')
        .setRequired(true)    
    )
    .addIntegerOption(option => option
        .setName('amount')
        .setDescription('The amount of money to take. If you want to take all target\'s money, you will be able to do it later')
        .setRequired(true)
        .setMinValue(1)
    )

async function execute(interaction){
    if (!currencies.length) return await interaction.reply({ content: `There isn't any currency, so you can't take, use \`/create-currency\` to create a new currency`, ephemeral: true })

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
            .setCustomId('submit-currency-take')
            .setLabel('Submit')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),

        new ButtonBuilder()
            .setCustomId('take-all-of-currency')
            .setLabel('Take All Of Selected Currency')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('empty-account')
            .setLabel('Empty Account')
            .setStyle(ButtonStyle.Danger)
    )


    await interaction.reply({ content: `Take **${amount}** **[Select Currency]** from **<@${target.id}>**'s account`, components: [new ActionRowBuilder().addComponents(selectCurrencyMenu), submitButton], ephemeral: true })

}

module.exports = {
    data: data,
    execute: execute
}