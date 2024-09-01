const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const currencies = require('../data/currencies.json')

const data = new SlashCommandBuilder()
    .setName('create-shop')
    .setDescription('Creates a Shop')
    .addStringOption(option => option
        .setName('shop-name')
        .setDescription('The name of the shop')
        .setRequired(true)
        .setMaxLength(120)
        .setMinLength(1)
    )

async function execute(interaction){
    if (!currencies.length) return await interaction.reply({ content: `There isn't any currency, so the shop creation can't be initialized, use \`/create-currency\` to create a new currency`, ephemeral: true })

    const shopName = interaction.options.getString('shop-name').replace(/ /g, ' ')

    if (shopName.removeCustomEmojisString().length == 0) return await interaction.reply({ content: `The shop name can't contain only custom emojis`, ephemeral: true })

    const selectCurrencyMenu = new StringSelectMenuBuilder()
        .setCustomId('select-currency')
        .setPlaceholder('Select a currency')
 
    currencies.forEach(currency => {
        selectCurrencyMenu.addOptions({
            label: currency.name.removeCustomEmojisString().cut(100),
            value: currency.id
        })
    })

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-currency-new-shop')
            .setLabel('Submit')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('change-shop-name')
            .setLabel('Change Shop Name')
            .setStyle(ButtonStyle.Secondary)
    )


    await interaction.reply({ content: `Create the shop **${shopName}** with the Currency **[Select Currency]**`, components: [new ActionRowBuilder().addComponents(selectCurrencyMenu), buttons], ephemeral: true })

}

module.exports = {
    data: data,
    execute: execute
}