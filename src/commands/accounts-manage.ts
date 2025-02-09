import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js"
import { getCurrencies, getOrCreateAccount } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"
import { AccountGiveFlow, AccountTakeFlow } from "../user-flows/accounts-flows"

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
        .setName('view-inventory')
        .setDescription('View user\'s inventory')
        .addUserOption(option => option
            .setName('target')
            .setDescription('The user you want to see the inventory of')
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
            await viewAccount(client, interaction)
            break
        case 'view-inventory':
            await viewInventory(client, interaction)
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
            return await replyErrorMessage(interaction)
    }
}

async function viewAccount(_client: Client, interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('target')
    if (!user) return replyErrorMessage(interaction)
    
    let userAccount = await getOrCreateAccount(user.id)
    const accountEmbed = new EmbedBuilder()
        .setTitle(`💰 _${user.tag}_'s Account`)
        .setDescription(`${user}'s balance:`)
        .setColor('Gold')
        .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})

    if (userAccount.currencies.size) {       
        userAccount.currencies.forEach(currency => {
            accountEmbed.addFields({name: currency.amount.toString(), value: currency.item.name, inline: true})
        })
    }
    else {
        accountEmbed.addFields({name: '\u200b', value: `**  ** ***❌${user} doesn\'t have any money***\n** **`})
    }

    await interaction.reply({ content: `Here is ${user} account:`, embeds: [accountEmbed], flags: MessageFlags.Ephemeral })
}

async function viewInventory(_client: Client, interaction: ChatInputCommandInteraction) {

}