import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js"
import { replyErrorMessage } from "../utils/utils"
import { DatabaseError } from "../database/database-types"
import { createCurrency, getCurrencies } from "../database/database-handler"

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
    

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
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
    const currencies = getCurrencies()
    if (currencies.size == 0) return replyErrorMessage(interaction, 'There isn\'t any currency, so you can\'t remove one, use `/currencies-manage create` to create a new currency')
        
    const selectCurrencyMenu = new StringSelectMenuBuilder()
        .setCustomId('select-currency')
        .setPlaceholder('Select a currency')
    

    currencies.forEach(currency => {
        selectCurrencyMenu.addOptions({
            label: currency.name.removeCustomEmojis().ellipsis(100),
            value: currency.id
        })
    })

    const submitButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-currency-remove')
            .setLabel('Remove Currency')
            .setEmoji({name: '⛔'})
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
    )


    await interaction.reply({ 
        content: `Remove **[Select Currency]**, ⚠️ __**it will also remove shops using this currency and take it from user's accounts**__`, 
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(selectCurrencyMenu), submitButton],
        flags: MessageFlags.Ephemeral 
    })
    
}
