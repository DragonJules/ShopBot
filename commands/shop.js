const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const shops = require('../data/shops.json')

const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Displays the shop and allows you to buy product')


async function execute(interaction){
    if (!shops.length) return await interaction.reply({ content: `There isn't any shop, use \`/create-shop\` to create a new one`, ephemeral: true })

    const selectedShop = shops[0]
    const shopName = selectedShop.name

    const shopEmbed = new EmbedBuilder()
        .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})
        .setTitle(shopName)
        .setDescription(`Use **\`/buy\`** or click **[ 🪙 Buy A Product ]** to buy product, **\`/account\`** or click **[ 💰 My Account ]** to check your amounts of different currencies`)
        .setColor('Gold')


    if (selectedShop.products.length) {
        selectedShop.products.forEach(product => {
            let descString = product.description ? product.description : '\u200b'
            shopEmbed.addFields({name: product.name + ` | Price: ${product.price} ${selectedShop.currency}`, value: descString, inline: true})
        })
    }
    else {
        shopEmbed.addFields({name: '\u200b', value: '**  ** *There is not any product here*'})
    }

    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop-show-shop')
        .setPlaceholder('Change Shop')
    
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: shop.name.removeCustomEmojisString().cut(100),
            value: shop.id
        })
    })

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('buy-button')
            .setLabel('Buy A Product')
            .setEmoji({name: '🪙'})
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!selectedShop.products.length),
        new ButtonBuilder()
            .setCustomId('show-account-button')
            .setLabel('My Account')
            .setEmoji({name: '💰'})
            .setStyle(ButtonStyle.Secondary)
    )

    await interaction.reply({ content: `Here is **${shopName}**`, embeds: [shopEmbed], components: [new ActionRowBuilder().addComponents(selectShopMenu), buttons], ephemeral: true })
}

module.exports = {
    data: data,
    execute: execute
}