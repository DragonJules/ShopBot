import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, Colors } from "discord.js"
import { getCurrencies, getOrCreateAccount } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"
import { AccountGiveFlow, AccountTakeFlow } from "../user-flows/accounts-flows"
import { AccountUserInterface } from "../user-interfaces/account-ui"

export const data = new SlashCommandBuilder()
    .setName('accounts-manage') 
    .setDescription('Manage your users')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName('view-account')
        .setDescription('View user\'s account')
        .addUserOption(option => option
            .setName('target')
            .setDescription('The user you want to see the account of')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('give')
        .setDescription('Gives money to user')
        .addUserOption(option => option
            .setName('target')
            .setDescription('The user you want to give money')
            .setRequired(true)    
        )
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('The amount of money to give')
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('take')
        .setDescription('Takes money from the user\'s inventory')
        .addUserOption(option => option
            .setName('target')
            .setDescription('The user you want to take money')
            .setRequired(true)    
        )
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('The amount of money to take. If you want to take all target\'s money, you will be able to do it later')
            .setRequired(true)
            .setMinValue(1)
        )
    )

export async function execute(client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()

    switch (subCommand) {
        case 'view-account':
            const user = interaction.options.getUser('target')
            if (!user) return replyErrorMessage(interaction, 'Invalid user')
    
            const accountUI = new AccountUserInterface(user)
            accountUI.display(interaction)
            
            break
        case 'give':
            const accountGiveFlow = new AccountGiveFlow()
            accountGiveFlow.start(interaction)    

            break
        case 'take':
            const accountTakeFlow = new AccountTakeFlow()
            accountTakeFlow.start(interaction)
            
            break
        default:
            return await replyErrorMessage(interaction, 'Invalid subcommand')
    }
}