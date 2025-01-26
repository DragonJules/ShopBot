import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js"
import { getCurrencies, getShops } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"

export const data = new SlashCommandBuilder()
    .setName('shops-manage') 
    .setDescription('Manage your Shops')
    .addSubcommand(subcommand => subcommand
        .setName('create')
        .setDescription('Create a new Shop')
        .addStringOption(option => option
            .setName('shop-name')
            .setDescription('The name of the shop')
            .setRequired(true)
            .setMaxLength(120)
            .setMinLength(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Removes the Selected Shop')
    )
    .addSubcommand(subcommand => subcommand
        .setName('reorder')
        .setDescription('Allows you to reorder shops')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()

}

async function createShop(_client: Client, interaction: ChatInputCommandInteraction) {
    const currencies = getCurrencies()
    if (!currencies.size) return await replyErrorMessage(interaction, 'There isn\'t any currency, so you can\'t create a new shop, use `/currencies-manage create` to create a new currency')
    
    const shopName = interaction.options.getString('shop-name')?.replaceNonBreakableSpace()
    if (shopName == null) return replyErrorMessage(interaction)

    if (shopName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, 'The shop name can\'t contain only custom emojis')

    const selectCurrencyMenu = new StringSelectMenuBuilder()
        .setCustomId('select-currency')
        .setPlaceholder('Select a currency')
    
    currencies.forEach(currency => {
        selectCurrencyMenu.addOptions({
            label: currency.name.removeCustomEmojis().ellipsis(100),
            value: currency.id
        })
    })

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
    
    
    await interaction.reply({ content: `Create the shop **${shopName}** with the Currency **[Select Currency]**`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectCurrencyMenu), buttons], flags: MessageFlags.Ephemeral })
    
}

async function removeShop(_client: Client, interaction: ChatInputCommandInteraction) {
    const shops = getShops()
    if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop, use `/shops-manage create` to create a new one')

    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop')
        .setPlaceholder('Select a shop')
    
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: shop.name.removeCustomEmojis().ellipsis(100),
            value: shop.id
        })
    })

    const submitButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-shop-remove')
            .setLabel('Remove Shop')
            .setEmoji({name: '⛔'})
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
    )
    
    await interaction.reply({ content: `Remove **[Select Shop]**`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), submitButton], flags: MessageFlags.Ephemeral })
}

async function reorderShops(_client: Client, interaction: ChatInputCommandInteraction) {
    const shops = getShops()
    if (!shops.size) return await interaction.reply({ content: `❌ There isn't any shop, use \`/create-shop\` to create a new one`, flags: MessageFlags.Ephemeral })

    let newPos = 0 + 1
    const selectedShop = shops.entries().next().value?.[1]!
    const shopName = selectedShop.name


    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop-reorder')
        .setPlaceholder('Select Shop')
    
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: shop.name.removeCustomEmojis().ellipsis(100),
            value: shop.id
        })
    })

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('up-shop-position')
            .setEmoji({name: '⬆️'})
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPos == 1),
        new ButtonBuilder()
            .setCustomId('down-shop-position')
            .setEmoji({name: '⬇️'})
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPos == shops.size),
        new ButtonBuilder()
            .setCustomId('submit-shop-new-pos')
            .setEmoji({name: '✅'})
            .setLabel(`Set position to ${newPos}`)
            .setStyle(ButtonStyle.Success)
    )

    await interaction.reply({ content: `Change position of **[${shopName}]** to __**${newPos}**__`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), buttons], flags: MessageFlags.Ephemeral })

}