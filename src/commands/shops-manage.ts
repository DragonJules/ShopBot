import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js"
import { getCurrencies, getShops } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"
import { DiscountCodeCreateFlow, DiscountCodeRemoveFlow, ShopCreateFlow, ShopRemoveFlow, ShopUpdateFlow, ShopUpdateOption } from "../user-flows/shops-flows"

export const data = new SlashCommandBuilder()
    .setName('shops-manage') 
    .setDescription('Manage your Shops')
    .addSubcommand(subcommand => subcommand
        .setName('create')
        .setDescription('Create a new Shop')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The name of the shop')
            .setRequired(true)
            .setMaxLength(120)
            .setMinLength(1)
        )
        .addStringOption(option => option
            .setName('description')
            .setDescription('The description of the shop')
            .setMaxLength(480)
            .setMinLength(1)
        )        
        .addStringOption(option => option
            .setName('emoji')
            .setDescription('The emoji of the currency')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Remove the selected shop')
    )
    .addSubcommand(subcommand => subcommand
        .setName('reorder')
        .setDescription('Reorder shops')
    )
    .addSubcommandGroup(subcommandgroup => subcommandgroup
        .setName('edit')
        .setDescription('Edit a shop')
        .addSubcommand(subcommand => subcommand
            .setName(ShopUpdateOption.NAME)
            .setDescription('Change Name. You will select the shop later')
            .addStringOption(option => option
                .setName('new-name')
                .setDescription('The new name of the shop')
                .setRequired(true)
                .setMaxLength(120)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(ShopUpdateOption.DESCRIPTION)
            .setDescription('Change Description. You will select the shop later')
            .addStringOption(option => option
                .setName('new-description')
                .setRequired(true)
                .setDescription('The new description of the shop')
                .setMaxLength(480)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(ShopUpdateOption.EMOJI)
            .setDescription('Change Emoji. You will select the shop later')
            .addStringOption(option => option
                .setName('new-emoji')
                .setDescription('The new emoji of the shop')
                .setRequired(true)
            )
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('create-discount-code')
        .setDescription('Create a discount code')
        .addStringOption(option => option
            .setName('code')
            .setDescription('The discount code')
            .setRequired(true)
            .setMaxLength(8)
            .setMinLength(6)
        )
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('The amount of the discount (in %)')
            .setRequired(true)
            .setMaxValue(100)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove-discount-code')
        .setDescription('Remove a discount code')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

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
        case 'create-discount-code':
            const createDiscountCodeFlow = new DiscountCodeCreateFlow()
            createDiscountCodeFlow.start(interaction)    

            break
        case 'remove-discount-code':
            const removeDiscountCodeFlow = new DiscountCodeRemoveFlow()
            removeDiscountCodeFlow.start(interaction)

            break
        default:
            if (subCommandGroup == 'edit') {
                const editShopFlow = new ShopUpdateFlow()
                editShopFlow.start(interaction)
                break
            }

            return await replyErrorMessage(interaction, 'Invalid subcommand')
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