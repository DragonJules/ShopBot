import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { AddActionProductFlow, AddProductFlow, EditProductFlow, EditProductOption, RemoveProductFlow } from "../user-flows/product-flows"
import { ErrorMessages } from "../utils/constants"
import { replyErrorMessage } from "../utils/utils"
import { ProductActionType } from "../database/database-types"

export const data = new SlashCommandBuilder()
    .setName('products-manage') 
    .setDescription('Manage your products')
    .addSubcommand(subcommand => subcommand
        .setName('add')
        .setDescription('Add a new product')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The name of the product')
            .setRequired(true)
            .setMaxLength(70)
            .setMinLength(1)
        )
        .addNumberOption(option => option
            .setName('price')
            .setDescription('The price of the product')
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(0)
        )
        .addStringOption(option => option
            .setName('description')
            .setDescription('The description of the product')
            .setMaxLength(300)
            .setMinLength(1)
        )
        .addStringOption(option => option
            .setName('emoji')
            .setDescription('The emoji of the product')
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName('action')
            .setDescription('The action of the product')
            .setRequired(false)
            .addChoices(
                { name: 'Give Role', value: ProductActionType.GiveRole },
                { name: 'Give Currency', value: ProductActionType.GiveCurrency }
            )
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Remove a product')
    )
    .addSubcommandGroup(subcommandgroup => subcommandgroup
        .setName('edit')
        .setDescription('Edit a product')
        .addSubcommand(subcommand => subcommand
            .setName(EditProductOption.NAME)
            .setDescription('Change Name. You will select the product later')
            .addStringOption(option => option
                .setName('new-name')
                .setDescription('The new name of the product')
                .setRequired(true)
                .setMaxLength(70)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(EditProductOption.DESCRIPTION)
            .setDescription('Change Description. You will select the product later')
            .addStringOption(option => option
                .setName('new-description')
                .setRequired(true)
                .setDescription('The new description of the product')
                .setMaxLength(300)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(EditProductOption.PRICE)
            .setDescription('Change Price. You will select the product later')
            .addNumberOption(option => option
                .setName('new-price')
                .setDescription('The new price of the product')
                .setRequired(true)
                .setMaxValue(99999999)
                .setMinValue(0)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(EditProductOption.EMOJI)
            .setDescription('Change Emoji. You will select the product later')
            .addStringOption(option => option
                .setName('new-emoji')
                .setDescription('The new emoji of the product (if you just want to remove it write anything)')
                .setRequired(true)
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

    switch (subCommand) {
        case 'add':
            if (interaction.options.getString('action') != null) {
                const addActionProductFlow = new AddActionProductFlow()
                addActionProductFlow.start(interaction)

                break
            }

            const addProductFlow = new AddProductFlow()
            addProductFlow.start(interaction)
            break

        case 'remove':
            const removeProductFlow = new RemoveProductFlow()
            removeProductFlow.start(interaction)

            break
            
        default:
            if (subCommandGroup == 'edit') {
                const editProductFlow = new EditProductFlow()
                editProductFlow.start(interaction)
                
                break
            }

            await replyErrorMessage(interaction, ErrorMessages.InvalidSubcommand)
    }
}