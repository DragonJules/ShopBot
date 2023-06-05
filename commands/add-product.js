const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');


const shops = require('../data/shops.json')

const data = new SlashCommandBuilder()
    .setName('add-product')
    .setDescription('Starts the product adding process')
    .addStringOption(option => option
        .setName('product-name')
        .setDescription('The name of the product')
        .setRequired(true)
        .setMaxLength(200)
        .setMinLength(1)
    )
    .addIntegerOption(option => option
        .setName('product-price')
        .setDescription('The price of the product')
        .setRequired(true)
        .setMaxValue(99999999)
        .setMinValue(0)
    )
    .addStringOption(option => option
        .setName('product-description')
        .setDescription('The description of the product')
        .setMaxLength(160)
        .setMinLength(1)
    )


async function execute(interaction){
    if (!shops.length) return await interaction.reply({ content: `There isn't any shop, so you can't add a product, use \`/create-shop\` to create a new shop`, ephemeral: true })
    
    const productName = interaction.options.getString('product-name').replace(/ /g, ' ')
    let productDescription = interaction.options.getString('product-description')
    const productPrice = interaction.options.getInteger('product-price')
    

    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop')
        .setPlaceholder('Select a shop')


    const submitButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-shop-new-product')
            .setLabel('Submit')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    )

    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: shop.name.removeCustomEmojisString().cut(100),
            value: shop.id
        })
    })

    let descString = (productDescription) ? `. Description: **${productDescription.replace(/ /g, ' ')}**` : ''

    await interaction.reply({ content: `Add Product: **${productName}** for **${productPrice}** in **[Select Shop]**${descString}`, components: [new ActionRowBuilder().addComponents(selectShopMenu), submitButton], ephemeral: true })
}

module.exports = {
    data: data,
    execute: execute
}