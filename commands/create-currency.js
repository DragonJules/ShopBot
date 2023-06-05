const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
const fs = require('node:fs/promises')
const uuid = require('uuid').v4

const currencies = require('../data/currencies.json')

const data = new SlashCommandBuilder()
    .setName('create-currency')
    .setDescription('Creates a new Currency')
    .addStringOption(option => option
        .setName('currency-name')
        .setDescription('The name of the currency')
        .setRequired(true)
        .setMaxLength(40)
        .setMinLength(1)
    )


async function execute(interaction){
    const currencyName = interaction.options.getString('currency-name').replace(/ /g, ' ')

    try {   
        if (currencies.findIndex(currency => currency.name === currencyName) == -1) {
            currencies.push({name: currencyName, id: uuid()})
            await fs.writeFile('./data/currencies.json', JSON.stringify(currencies, null, 4))
            await interaction.reply({ content: `You succesfully created the currency **${currencyName}**, use \`/remove-currency\` to remove it`, ephemeral: true })
        }
        else {
            await interaction.reply({ content: `This Currency already exists`, ephemeral: true })
        }
        
    } catch (error) {
        console.log(error);
        await interaction.reply({ content: `An error occured while creating the currency, please try again later`, ephemeral: true })
    }
}

module.exports = {
    data: data,
    execute: execute
}