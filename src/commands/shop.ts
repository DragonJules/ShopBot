import { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChatInputCommandInteraction } from 'discord.js'
import { getShops } from '../database/database-handler'
import { ellipsis, removeCustomEmojisString, replyErrorMessage } from '../utils/utils'

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Displays the shop and allows you to buy product')


export async function execute(interaction: ChatInputCommandInteraction){
    const shops = getShops()
    if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop, use `/shops-manage create` to create a new one')

    const selectedShop = shops.entries().next().value?.[1]!
    const shopName = selectedShop.name

    const shopEmbed = new EmbedBuilder()
        .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})
        .setTitle(shopName)
        .setDescription(`Use **\`/buy\`** or click **[ 🪙 Buy A Product ]** to buy product, **\`/account\`** or click **[ 💰 My Account ]** to check your amounts of different currencies`)
        .setColor('Gold')


    if (selectedShop.products.length) {
        selectedShop.products.forEach(product => {
            let descString = product.description ? product.description : '\u200b'
            shopEmbed.addFields({name: product.name + ` | Price: ${product.price} ${selectedShop.currency}`, value: descString, inline: true})
        })
    }
    else {
        shopEmbed.addFields({name: '\u200b', value: '**  ** *There is not any product here*'})
    }

    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop-show-shop')
        .setPlaceholder('Change Shop')
    
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: ellipsis(removeCustomEmojisString(shop.name), 100),
            value: shop.id
        })
    })

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('buy-button')
            .setLabel('Buy A Product')
            .setEmoji({name: '🪙'})
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!selectedShop.products.length),
        new ButtonBuilder()
            .setCustomId('show-account-button')
            .setLabel('My Account')
            .setEmoji({name: '💰'})
            .setStyle(ButtonStyle.Secondary)
    )

    await interaction.reply({ content: `Here is **${shopName}**`, embeds: [shopEmbed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), buttons], flags: MessageFlags.Ephemeral })
}
