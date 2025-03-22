import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js'
import { ShopUserInterface } from '../user-interfaces/shop-ui'

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Display shops and buy products')


export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const shopInterface = new ShopUserInterface()
    shopInterface.display(interaction)
}
