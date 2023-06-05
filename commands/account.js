const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs/promises')

const accounts = require('../data/accounts.json')

const data = new SlashCommandBuilder()
    .setName('account')
    .setDescription('Shows account')


async function execute(interaction){
    const user = interaction.member 
    let userAccount = accounts.find(account => account['user-id'] == user.id)

    if (!userAccount) {
        try {
            accounts.push({'user-id': user.id, currencies: []})
            await fs.writeFile('./data/accounts.json', JSON.stringify(accounts, null, 4))
            userAccount = accounts.find(account => account['user-id'] == user.id)
        } catch (error) {
            console.log(error);
            return await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
        }
    }


    const accountEmbed = new EmbedBuilder()
        .setTitle('💰 Your Account')
        .setDescription('Your balance:')
        .setColor('Gold')
        .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})

    if (userAccount.currencies.length) {       
        userAccount.currencies.forEach(currency => {
            accountEmbed.addFields({name: currency.amount.toString(), value: currency.name, inline: true})
        })
    }
    else {
        accountEmbed.addFields({name: '\u200b', value: '**  ** ***❌ You don\'t have any money***\n** **'})
    }


    await interaction.reply({ content: `Here is your account:`, components: [], embeds: [accountEmbed], ephemeral: true })
}

module.exports = {
    data: data,
    execute: execute
}