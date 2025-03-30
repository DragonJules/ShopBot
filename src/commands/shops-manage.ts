import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { DiscountCodeCreateFlow, DiscountCodeRemoveFlow, EditShopCurrencyFlow, EditShopFlow, EditShopOption, ShopCreateFlow, ShopRemoveFlow, ShopReorderFlow } from "../user-flows/shops-flows"
import { ErrorMessages } from "../utils/constants"
import { replyErrorMessage } from "../utils/utils"

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
            .setDescription('The emoji of the shop')
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
            .setName(EditShopOption.NAME)
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
            .setName(EditShopOption.DESCRIPTION)
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
            .setName(EditShopOption.EMOJI)
            .setDescription('Change Emoji. You will select the shop later')
            .addStringOption(option => option
                .setName('new-emoji')
                .setDescription('The new emoji of the shop')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('currency')
            .setDescription('Change Currency. You will select the shop later')
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
            const reorderShopsFlow = new ShopReorderFlow()
            reorderShopsFlow.start(interaction)
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
                if (subCommand == 'currency') {
                    const editShopCurrencyFlow = new EditShopCurrencyFlow()
                    editShopCurrencyFlow.start(interaction)
                    break
                }

                const editShopFlow = new EditShopFlow()
                editShopFlow.start(interaction)
                break
            }

            await replyErrorMessage(interaction, ErrorMessages.InvalidSubcommand)
    }

}
