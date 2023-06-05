const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const shops = require('../data/shops.json')

const data = new SlashCommandBuilder()
    .setName('reorder-shops')
    .setDescription('Allows you to reorder shops')


async function execute(interaction){
    if (!shops.length) return await interaction.reply({ content: `❌ There isn't any shop, use \`/create-shop\` to create a new one`, ephemeral: true })

    let newPos = 0 + 1
    const selectedShop = shops[0]
    const shopName = selectedShop.name


    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop-reorder')
        .setPlaceholder('Select Shop')
    
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: shop.name.removeCustomEmojisString().cut(100),
            value: shop.id
        })
    })

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('up-shop-position')
            .setEmoji({name: '⬆️'})
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPos == 1),
        new ButtonBuilder()
            .setCustomId('down-shop-position')
            .setEmoji({name: '⬇️'})
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPos == shops.length),
        new ButtonBuilder()
            .setCustomId('submit-shop-new-pos')
            .setEmoji({name: '✅'})
            .setLabel(`Set position to ${newPos}`)
            .setStyle(ButtonStyle.Success)
    )

    await interaction.reply({ content: `Change position of **[${shopName}]** to __**${newPos}**__`, components: [new ActionRowBuilder().addComponents(selectShopMenu), buttons], ephemeral: true })
}

module.exports = {
    data: data,
    execute: execute
}