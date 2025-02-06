import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js"
import { replyErrorMessage } from "../utils/utils"
import { DatabaseError } from "../database/database-types"
import { createCurrency, getCurrencies } from "../database/database-handler"
import { CurrencyRemoveFlow } from "../user-flows/currencies-flows"

export const data = new SlashCommandBuilder()
    .setName('currencies-manage') 
    .setDescription('Manage your currencies')
    .addSubcommand(subcommand => subcommand
        .setName('create')
        .setDescription('Creates a new Currency')
        .addStringOption(option => option
            .setName('currency-name')
            .setDescription('The name of the currency')
            .setRequired(true)
            .setMaxLength(40)
            .setMinLength(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Removes the Selected Shop')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    

export async function execute(client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()

    switch (subCommand) {
        case 'create':
            return await createCurrencyCommand(client, interaction)
        case 'remove':
            return await removeCurrency(client, interaction)
        default:
            return await replyErrorMessage(interaction)
    }
}

export async function createCurrencyCommand(_client: Client, interaction: ChatInputCommandInteraction) {
    const currencyName = interaction.options.getString('currency-name')?.replaceNonBreakableSpace()
    if (currencyName == null) return replyErrorMessage(interaction)
    
    try {
        if (currencyName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, 'The currency name can\'t contain only custom emojis')
        
        createCurrency(currencyName)

        await interaction.reply({ content: `You succesfully created the currency **${currencyName}**, use \`/currencies-manage remove\` to remove it`, flags: MessageFlags.Ephemeral })
        
    } catch (error) {
        return await replyErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
    }

}

export async function removeCurrency(_client: Client, interaction: ChatInputCommandInteraction) {
    const currencyRemoveFlow = new CurrencyRemoveFlow()
    currencyRemoveFlow.start(interaction)
}
