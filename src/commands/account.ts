import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js"
import { getOrCreateAccount } from "../database/database-handler"
import { replyErrorMessage } from "../utils/utils"

export const data = new SlashCommandBuilder()
    .setName('account')
    .setDescription('Shows account')


export async function execute(interaction: ChatInputCommandInteraction){
    const member = interaction.member
    if (!member) return replyErrorMessage(interaction)

    let userAccount = await getOrCreateAccount(member.user.id)

    const accountEmbed = new EmbedBuilder()
        .setTitle('💰 Your Account')
        .setDescription('Your balance:')
        .setColor('Gold')
        .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})

    if (userAccount.currencies.length) {       
        userAccount.currencies.forEach(currency => {
            accountEmbed.addFields({name: currency.amount.toString(), value: currency.item.name, inline: true})
        })
    }
    else {
        accountEmbed.addFields({name: '\u200b', value: '**  ** ***❌ You don\'t have any money***\n** **'})
    }

    await interaction.reply({ content: `Here is your account:`, components: [], embeds: [accountEmbed], flags: MessageFlags.Ephemeral })
}
