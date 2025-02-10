import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js"
import { getShops } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"
import { AddProductFlow, RemoveProductFlow, UpdateOption, UpdateProductFlow } from "../user-flows/product-flows"

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
            .setMaxLength(160)
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
            .setMaxLength(450)
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
            .setName(UpdateOption.NAME)
            .setDescription('Change Name. You will select the product later')
            .addStringOption(option => option
                .setName('new-name')
                .setDescription('The new name of the product')
                .setRequired(true)
                .setMaxLength(160)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(UpdateOption.DESCRIPTION)
            .setDescription('Change Description. You will select the product later')
            .addStringOption(option => option
                .setName('new-description')
                .setRequired(true)
                .setDescription('The new description of the product')
                .setMaxLength(450)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(UpdateOption.PRICE)
            .setDescription('Change Price. You will select the product later')
            .addNumberOption(option => option
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
    const subCommandGroup = interaction.options.getSubcommandGroup()

    switch (subCommand) {
        case 'add':
            const addProductFlow = new AddProductFlow()
            addProductFlow.start(interaction)
            break
        case 'remove':
            const removeProductFlow = new RemoveProductFlow()
            removeProductFlow.start(interaction)

            break
        default:
            if (subCommandGroup == 'update') {
                const updateProductFlow = new UpdateProductFlow()
                updateProductFlow.start(interaction)
                
                break
            }
            
            return await replyErrorMessage(interaction, 'Invalid subcommand')
    }
}