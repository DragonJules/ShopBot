const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');


const shops = require('../data/shops.json')

const data = new SlashCommandBuilder()
    .setName('update-product')
    .setDescription('Updates the product name/price')
    .addSubcommand(subcommand => subcommand
        .setName('change-name')
        .setDescription('Change Name. You will select the product later')
        .addStringOption(option => option
            .setName('new-name')
            .setDescription('The new name of the product')
            .setRequired(true)
            .setMaxLength(200)
            .setMinLength(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('change-description')
        .setDescription('Change Description. You will select the product later')
        .addStringOption(option => option
            .setName('new-description')
            .setRequired(true)
            .setDescription('The new description of the product')
            .setMaxLength(160)
            .setMinLength(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('change-price')
        .setDescription('Change Price. You will select the product later')
        .addIntegerOption(option => option
            .setName('new-price')
            .setDescription('The new price of the product')
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(0)
        )
    )
    
    
async function execute(interaction){
    if (!shops.length) return await interaction.reply({ content: `There isn't any shop with products, use \`/create-shop\` to create a new shop, and \`/add-product\` to add products`, ephemeral: true })

    const subcommand = interaction.options.getSubcommand()
    let updateOption = (subcommand == 'change-name') ? 'Name' : (subcommand == 'change-description') ? 'Description' : 'Price'
    let updateOptionValue = (subcommand == 'change-name') ? interaction.options.getString('new-name').replace(/ /g, ' ') : (subcommand == 'change-description') ? interaction.options.getString('new-description').replace(/ /g, ' ') : interaction.options.getInteger('new-price')
    
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
            .setCustomId('submit-shop-update-product')
            .setLabel('Submit Shop')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    )

    await interaction.reply({ content: `Update product from **[Select Shop]**. New **${updateOption}**: **${updateOptionValue}**`, components: [new ActionRowBuilder().addComponents(selectShopMenu), submitButton], ephemeral: true })
}

module.exports = {
    data: data,
    execute: execute
}