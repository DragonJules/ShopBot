import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js"
import { getCurrencies, getOrCreateAccount } from "../database/database-handler"
import { ellipsis, removeCustomEmojisString, replyErrorMessage } from "../utils/utils"

export const data = new SlashCommandBuilder()
    .setName('user-manage') 
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

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
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

    if (userAccount.currencies.length) {       
        userAccount.currencies.forEach(currency => {
            accountEmbed.addFields({name: currency.amount.toString(), value: currency.item.name, inline: true})
        })
    }
    else {
        accountEmbed.addFields({name: '\u200b', value: `**  ** ***❌${user} doesn\'t have any money***\n** **`})
    }

    await interaction.reply({ content: `Here is ${user} account:`, embeds: [accountEmbed], flags: MessageFlags.Ephemeral })
}

async function viewInventory(_client: Client, interaction: ChatInputCommandInteraction) {

}

async function giveMoney(_client: Client, interaction: ChatInputCommandInteraction) {
    const currencies = getCurrencies()
    if (!currencies.size) return replyErrorMessage(interaction, 'There isn\'t any currency, so you can\'t give money, use `/currencies-manage create` to create a new currency')

    const target = interaction.options.getUser('target')
    const amount = interaction.options.getInteger('amount')

    if (!target || !amount) return replyErrorMessage(interaction)

    const selectCurrencyMenu = new StringSelectMenuBuilder()
        .setCustomId('select-currency')
        .setPlaceholder('Select a currency')
    
    currencies.forEach(currency => {
        selectCurrencyMenu.addOptions({
            label: ellipsis(removeCustomEmojisString(currency.name), 100),
            value: currency.id
        })
    })

    const submitButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-currency-give')
            .setLabel('Submit')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    )


    await interaction.reply({ content: `Give **${amount}** **[Select Currency]** to **${target}**`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectCurrencyMenu), submitButton], flags: MessageFlags.Ephemeral })
    
}

async function takeMoney(_client: Client, interaction: ChatInputCommandInteraction) {
    const currencies = getCurrencies()
    if (!currencies.size) return replyErrorMessage(interaction, 'There isn\'t any currency, so you can\'t give money, use `/currencies-manage create` to create a new currency')

    const target = interaction.options.getUser('target')
    const amount = interaction.options.getInteger('amount')

    if (!target || !amount) return replyErrorMessage(interaction)

    const selectCurrencyMenu = new StringSelectMenuBuilder()
        .setCustomId('select-currency')
        .setPlaceholder('Select a currency')
    
    currencies.forEach(currency => {
        selectCurrencyMenu.addOptions({
            label: ellipsis(removeCustomEmojisString(currency.name), 100),
            value: currency.id
        })
    })

    const submitButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('submit-currency-take')
            .setLabel('Submit')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),

        new ButtonBuilder()
            .setCustomId('take-all-of-currency')
            .setLabel('Take All Of Selected Currency')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('empty-account')
            .setLabel('Empty Account')
            .setStyle(ButtonStyle.Danger)
    )


    await interaction.reply({ content: `Take **${amount}** **[Select Currency]** from **<@${target.id}>**'s account`, components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectCurrencyMenu), submitButton], flags: MessageFlags.Ephemeral })
    
}