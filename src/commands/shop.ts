import { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChatInputCommandInteraction, Client } from 'discord.js'
import { getShops } from '../database/database-handler'
import { replyErrorMessage } from '../utils/utils'

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Displays the shop and allows you to buy product')


export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const shops = getShops()
    if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop.\n-# Use `/shops-manage create` to create a new one')

    const selectedShop = shops.entries().next().value?.[1]!
    const shopName = selectedShop.name

    const shopEmbed = new EmbedBuilder()
        .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})
        .setTitle(shopName)
        .setDescription(`${selectedShop.description}\n\nProducts:`)
        .setColor('Gold')


    if (selectedShop.products.size) {
        selectedShop.products.forEach(product => {
            let descString = product.description ? product.description : '\u200b'
            shopEmbed.addFields({name: product.name + ` | Price: ${product.price} ${selectedShop.currency.name}`, value: descString, inline: true})
        })
    }
    else {
        shopEmbed.addFields({name: '\u200b', value: '**  ** *There is not any product here*'})
    }

    const selectShopMenu = new StringSelectMenuBuilder()
        .setCustomId('select-shop-show-shop')
        .setPlaceholder('Change Shop')
    
    shops.forEach(shop => {
        selectShopMenu.addOptions({
            label: shop.name.removeCustomEmojis().ellipsis(100),
            value: shop.id
        })
    })

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('buy-button')
            .setLabel('Buy A Product')
            .setEmoji({name: '🪙'})
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!selectedShop.products.size),
        new ButtonBuilder()
            .setCustomId('show-account-button')
            .setLabel('My Account')
            .setEmoji({name: '💰'})
            .setStyle(ButtonStyle.Secondary)
    )

    await interaction.reply({ embeds: [shopEmbed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectShopMenu), buttons], flags: MessageFlags.Ephemeral })
}
