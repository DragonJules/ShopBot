import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js"
import { getCurrencies, getShops } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"
import { ShopCreateFlow, ShopRemoveFlow } from "../user-flows/shops-flows"

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

    switch (subCommand) {
        case 'create':
            const createShopFlow = new ShopCreateFlow()
            createShopFlow.start(interaction)
            break
        case 'remove':
            const removeShopFlow = new ShopRemoveFlow()
            removeShopFlow.start(interaction)
            break
        case 'reorder':
            break
        default:
            return await replyErrorMessage(interaction)
    }

}

async function reorderShops(_client: Client, interaction: ChatInputCommandInteraction) {
    const shops = getShops()
    if (!shops.size) return await interaction.reply({ content: `❌ There isn't any shop./n-# Use \`/create-shop\` to create a new one`, flags: MessageFlags.Ephemeral })

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

    await interaction.reply({ content: `Change position of **[${shopName}]** to __**${newPos}**__`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), buttons], flags: MessageFlags.Ephemeral })

}