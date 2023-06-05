const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ButtonStyle, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');


const currencies = require('../data/currencies.json')

const data = new SlashCommandBuilder()
    .setName('remove-currency')
    .setDescription('Removes the Selected Currency')


async function execute(interaction){
    if (!currencies.length) return await interaction.reply({ content: `There isn't any currency, so you can't remove one, use \`/create-currency\` to create a new currency`, ephemeral: true })
    
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
            .setCustomId('submit-currency-remove')
            .setLabel('Remove Currency')
            .setEmoji({name: '⛔'})
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
    )

    

    await interaction.reply({ content: `Remove **[Select Currency]**, ⚠️ __**it will also remove shops using this money and take it from user's accounts**__`, components: [new ActionRowBuilder().addComponents(selectCurrencyMenu), submitButton], ephemeral: true })
}

module.exports = {
    data: data,
    execute: execute
}