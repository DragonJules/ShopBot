import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js"
import { getShops } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"
import { AddProductFlow, RemoveProductFlow } from "../user-flows/product-flows"

export const data = new SlashCommandBuilder()
    .setName('products-manage') 
    .setDescription('Manage your products')
    .addSubcommand(subcommand => subcommand
        .setName('add')
        .setDescription('Starts the product adding process')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The name of the product')
            .setRequired(true)
            .setMaxLength(200)
            .setMinLength(1)
        )
        .addIntegerOption(option => option
            .setName('price')
            .setDescription('The price of the product')
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(0)
        )
        .addStringOption(option => option
            .setName('description')
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
        .setDescription('Updates the product name')
        .addSubcommand(subcommand => subcommand
            .setName('name')
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
            .setName('description')
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
            .setName('price')
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

    switch (subCommand) {
        case 'add':
            const addProductFlow = new AddProductFlow()
            addProductFlow.start(interaction)
            break
        case 'remove':
            const removeProductFlow = new RemoveProductFlow()
            removeProductFlow.start(interaction)

            break
        case 'update':
            break
        default:
            return await replyErrorMessage(interaction)
    }
}


async function updateProduct(_client: Client, interaction: ChatInputCommandInteraction) {
    const shops = getShops()
    if (!shops.size) return replyErrorMessage(interaction, `There isn't any shop with products./n-# Use \`/shops-manage create\` to create a new shop, and \`/products-manage add\` to add products`)

    const subcommand = interaction.options.getSubcommand()
    if (!subcommand) return replyErrorMessage(interaction)

    const updateOption = getUpdateOption(subcommand)
    const updateOptionValue = getUpdateOptionValue(interaction, subcommand)
    
    if (updateOption === '' || updateOptionValue === '') return replyErrorMessage(interaction)

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
            .setCustomId('submit-shop-update-product')
            .setLabel('Submit Shop')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    )

    await interaction.reply({ content: `Update product from **[Select Shop]**. New **${updateOption}**: **${updateOptionValue}**`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), submitButton], flags: MessageFlags.Ephemeral })
}

function getUpdateOption(subcommand: string): string {
    switch (subcommand) {
        case 'change-name':
            return 'Name'
        case 'change-description':
            return 'Description'
        case 'change-price':
            return 'Price'
        default:
            return ''
    }
}

function getUpdateOptionValue(interaction: ChatInputCommandInteraction, subcommand: string): string {
    switch (subcommand) {
        case 'change-name':
            return interaction.options.getString('new-name')?.replaceNonBreakableSpace() || ''
        case 'change-description':
            return interaction.options.getString('new-description')?.replaceNonBreakableSpace() || ''
        case 'change-price':
            return `${interaction.options.getInteger('new-price') || ''}`
        default:
            return ''
    }
}