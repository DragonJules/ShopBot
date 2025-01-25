import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js"
import { getShops } from "../database/database-handler"
import { ellipsis, removeCustomEmojisString, replaceNonBreakableSpace, replyErrorMessage } from "../utils/utils"

export const data = new SlashCommandBuilder()
    .setName('products-manage') 
    .setDescription('Manage your products')
    .addSubcommand(subcommand => subcommand
        .setName('add')
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
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Remove a product')
    )
    .addSubcommandGroup(subcommandgroup => subcommandgroup
        .setName('update')
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
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
}


async function addProduct(_client: Client, interaction: ChatInputCommandInteraction) {
    const shops = getShops()
    if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop with products, use `/shops-manage create` to create a new shop')
        
        const productName = replaceNonBreakableSpace(interaction.options.getString('product-name'))
        let productDescription = interaction.options.getString('product-description')
        const productPrice = interaction.options.getInteger('product-price')

        if (!productName || !productPrice || !productDescription) return replyErrorMessage(interaction)
    
        if (removeCustomEmojisString(productName).length == 0) return replyErrorMessage(interaction, 'The product name can\'t contain only custom emojis')
        if (removeCustomEmojisString(productDescription).length == 0) return replyErrorMessage(interaction, 'The product description can\'t contain only custom emojis')
        
    
        const selectShopMenu = new StringSelectMenuBuilder()
            .setCustomId('select-shop')
            .setPlaceholder('Select a shop')
    
    
        const submitButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('submit-shop-new-product')
                .setLabel('Submit')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
        )
    
        shops.forEach(shop => {
            selectShopMenu.addOptions({
                label: ellipsis(removeCustomEmojisString(shop.name), 100),
                value: shop.id
            })
        })
    
        let descString = (productDescription) ? `. Description: **${replaceNonBreakableSpace(productDescription)}**` : ''
    
        await interaction.reply({ content: `Add Product: **${productName}** for **${productPrice}** in **[Select Shop]**${descString}`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), submitButton], flags: MessageFlags.Ephemeral })
}

async function removeProduct(_client: Client, interaction: ChatInputCommandInteraction) {
    const shops = getShops()
    if (!shops.size) return replyErrorMessage(interaction, `There isn't any shop, so you can't remove a product, use \`/shops-manage create\` to create a new shop, and \`/products-manage add\` to add products`)
    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop')
        .setPlaceholder('Select a shop')
 
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: ellipsis(removeCustomEmojisString(shop.name), 100),
            value: shop.id
        })
    })

    const submitButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-shop-remove-product')
            .setLabel('Submit Shop')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    )

    await interaction.reply({ content: `Remove product from **[Select Shop]**`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), submitButton], flags: MessageFlags.Ephemeral })
}

async function updateProduct(_client: Client, interaction: ChatInputCommandInteraction) {
    const shops = getShops()
    if (!shops.size) return replyErrorMessage(interaction, `There isn't any shop with products, use \`/shops-manage create\` to create a new shop, and \`/products-manage add\` to add products`)

    const subcommand = interaction.options.getSubcommand()
    if (!subcommand) return replyErrorMessage(interaction)

    let updateOption = (subcommand == 'change-name') ? 'Name' : (subcommand == 'change-description') ? 'Description' : 'Price'
    let updateOptionValue = (subcommand == 'change-name') ? replaceNonBreakableSpace(interaction.options.getString('new-name')) : (subcommand == 'change-description') ? replaceNonBreakableSpace(interaction.options.getString('new-description')) : interaction.options.getInteger('new-price')
    
    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop')
        .setPlaceholder('Select a shop')
    
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: ellipsis(removeCustomEmojisString(shop.name), 100),
            value: shop.id
        })
    })

    const submitButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-shop-update-product')
            .setLabel('Submit Shop')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    )

    await interaction.reply({ content: `Update product from **[Select Shop]**. New **${updateOption}**: **${updateOptionValue}**`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), submitButton], flags: MessageFlags.Ephemeral })
}