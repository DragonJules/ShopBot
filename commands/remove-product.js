const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ButtonStyle, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');


const shops = require('../data/shops.json')

const data = new SlashCommandBuilder()
    .setName('remove-product')
    .setDescription('Removes a Product from the Selected Shop')

async function execute(interaction){
    if (!shops.length) return await interaction.reply({ content: `There isn't any shop, so you can't remove a product, use \`/create-shop\` to create a new shop, and \`/add-product\` to add products`, ephemeral: true })

    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop')
        .setPlaceholder('Select a shop')
 
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: shop.name.removeCustomEmojisString().cut(100),
            value: shop.id
        })
    })

    const submitButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-shop-remove-product')
            .setLabel('Submit Shop')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    )

    await interaction.reply({ content: `Remove product from **[Select Shop]**`, components: [new ActionRowBuilder().addComponents(selectShopMenu), submitButton], ephemeral: true })
}

module.exports = {
    data: data,
    execute: execute
}