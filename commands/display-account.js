const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs/promises')

const accounts = require('../data/accounts.json')

const data = new SlashCommandBuilder()
    .setName('display-account')
    .setDescription('Shows account')
    .addUserOption(option => option
        .setName('target')
        .setDescription('The user you want to see the account of')
        .setRequired(true)
    )

async function execute(interaction){
    const user = interaction.options.getUser('target')
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
        .setTitle(`💰 _${user.tag}_'s Account`)
        .setDescription(`${user}'s balance:`)
        .setColor('Gold')
        .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})

    if (userAccount.currencies.length) {       
        userAccount.currencies.forEach(currency => {
            accountEmbed.addFields({name: currency.amount.toString(), value: currency.name, inline: true})
        })
    }
    else {
        accountEmbed.addFields({name: '\u200b', value: `**  ** ***❌${user} doesn\'t have any money***\n** **`})
    }


    await interaction.reply({ content: `Here is ${user} account:`, components: [], embeds: [accountEmbed], ephemeral: true })
}

module.exports = {
    data: data,
    execute: execute
}