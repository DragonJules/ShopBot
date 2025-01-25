import fs from 'node:fs/promises'

import wait from 'node:timers/promises'
import config from '../../config/config.json'

import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, Interaction, Client, ChannelType, InteractionType } from 'discord.js'
import { PrettyLog } from '../utils/pretty-log'
import { replaceNonBreakableSpace, replyErrorMessage } from '../utils/utils'


export const name = 'interactionCreate'


export async function execute(interaction: Interaction) {
    if (interaction.type != InteractionType.ApplicationCommand) return
    if (interaction.user.bot) return
    
    const client = interaction.client

    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName)
        if (!command) return

        if (interaction?.channel?.type === ChannelType.DM) return

        try {
            await command.execute(interaction.client, interaction)
            PrettyLog.info(`${interaction.user.username} (${interaction.user.id}) in #${interaction?.channel?.name} (${interaction?.channel?.id}) triggered the command '/${interaction.commandName}'`)
        } catch (error: unknown) {
            console.error(error)
            PrettyLog.error(`Failed to execute the command '/${interaction.commandName}' (user: ${interaction.user.username} (${interaction.user.id}) in #${interaction?.channel?.name} (${interaction?.channel?.id}))`)
            
            await replyErrorMessage(interaction)
        }
    }

    
//     if (interaction.isModalSubmit()) {
//         if (interaction.customId === 'change-shop-name-modal') {
//             const shopName = replaceNonBreakableSpace(interaction.fields.getTextInputValue('shop-name-input'))
            
//             const newMessage = interaction.message.content.replace(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[0], `**${shopName}**`)
//             interaction.update(newMessage)
//         }


//         if (interaction.customId === 'empty-account-modal') {
//             if (interaction.fields.getTextInputValue('confirm-empty-input').toLowerCase() === 'yes') {
//                 const target = interaction.message.mentions.members.first()
                
//                 try {
//                     let account = accounts.find(account => account['user-id'] === target.id)
//                     if (!account) return await interaction.update({ content: `${target} doesn't have an account`, components: [] })
//                     account.currencies = []
//                     await save(accounts)
//                     await interaction.update({ content: `You succesfully emptied ${target}'s account`, components: [] })
//                     if (config.logChannelId) {
//                         let logChannel = await interaction.guild.channels.fetch(config.logChannelId)
//                         await logChannel.send(`${interaction.member} emptied ${target}'s account`)
//                     }
//                 } catch (error) {
//                     console.log(error)
//                     await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//                 }
//             }
//             else {
//                 interaction.reply('Make sure to confirm if you want to empty account')
//                 await wait(7500)
//                 interaction.deleteReply()
//             }

//         }

//     }


//     if (interaction.isStringSelectMenu()) {
//         if (interaction.customId === 'select-shop') {

//             let submitButton = interaction.message.components[1]
//                 submitButton.components[0].data.disabled = false

//             let selectedShop = shops.find(shop => shop.id === interaction.values[0])

//             let oldMessage = interaction.message.content
//             let newMessage = oldMessage.replace(/\*\*\[[^ ]+\]\*\*/g, `**[${selectedShop.name}]**`)

//             await interaction.update({ content: newMessage, components: [interaction.message.components[0], submitButton] })
//         }
//         if (interaction.customId === 'select-currency') {

//             let submitButton = interaction.message.components[1]
//                 submitButton.components[0].data.disabled = false

//             let selectedCurrency = currencies.find(currency => currency.id === interaction.values[0])

//             let oldMessage = interaction.message.content
//             let newMessage = oldMessage.replace(/\*\*\[[^ ]+\]\*\*/g, `**[${selectedCurrency.name}]**`)

//             await interaction.update({ content: newMessage, components: [interaction.message.components[0], submitButton] })
//         }
//         if (interaction.customId === 'select-product') {

//             let submitButton = interaction.message.components[1]
//                 submitButton.components[0].data.disabled = false

//             let selectedShopName = interaction.message.content.match(/ from \*\*[^ ]+\*\*/g)[0].substring(6).replace(/\*/g, '')
//             let selectedShop = shops.find(shop => shop.name === selectedShopName)
//             let selectedProduct = selectedShop.products.find(product => product.id === interaction.values[0])

//             let oldMessage = interaction.message.content
//             let newMessage = oldMessage.replace(/\*\*\[[^ ]+\]\*\*/g, `**[${selectedProduct.name}]**`)

//             await interaction.update({ content: newMessage, components: [interaction.message.components[0], submitButton] })
//         }

//         if (interaction.customId === 'select-shop-show-shop') {
//             const selectedShop = shops.find(shop => shop.id == interaction.values[0])
//             const shopName = selectedShop.name

//             const shopEmbed = new EmbedBuilder()
//                 .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})
//                 .setTitle(shopName)
//                 .setDescription(`Use **\`/buy\`** or click **[ 🪙 Buy A Product ]** to buy product, **\`/account\`** or click **[ 💰 My Account ]** to check your amounts of different currencies`)
//                 .setColor('Gold')


//             if (selectedShop.products.length) {
//                 selectedShop.products.forEach(product => {
//                     let descString = product.description ? product.description : '\u200b'
//                     shopEmbed.addFields({name: product.name + ` | Price: ${product.price} ${selectedShop.currency}`, value: descString, inline: true})
//                 })
//             }   
//             else {
//                 shopEmbed.addFields({name: '\u200b', value: '**  ** *There is not any product here*'})
//             }

//             const selectShopMenu = new StringSelectMenuBuilder()
//                 .setCustomId('select-shop-show-shop')
//                 .setPlaceholder('Change Shop')
            
//             shops.forEach(shop => {
//                 selectShopMenu.addOptions({
//                     label: shop.name.removeCustomEmojisString().cut(100),
//                     value: shop.id
//                 })
//             })

//             const buttons = new ActionRowBuilder().addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('buy-button')
//                     .setLabel('Buy A Product')
//                     .setEmoji({name: '🪙'})
//                     .setStyle(ButtonStyle.Primary)
//                     .setDisabled(!selectedShop.products.length),
//                 new ButtonBuilder()
//                     .setCustomId('show-account-button')
//                     .setLabel('My Account')
//                     .setEmoji({name: '💰'})
//                     .setStyle(ButtonStyle.Secondary)
//             )
            

//             await interaction.update({ content: `Here is **${shopName}**:`, components: [new ActionRowBuilder().addComponents(selectShopMenu), buttons], embeds: [shopEmbed] })
//         }

//         if (interaction.customId === 'select-shop-reorder') {
//             const selectedShop = shops.find(shop => shop.id == interaction.values[0])
//             const shopName = selectedShop.name

//             let newPos = 0 + 1

//             const selectShopMenu = new StringSelectMenuBuilder()
//                 .setCustomId('select-shop-reorder')
//                 .setPlaceholder('Select Shop')
            
//             shops.forEach(shop => {
//                 selectShopMenu.addOptions({
//                     label: shop.name.removeCustomEmojisString().cut(100),
//                     value: shop.id
//                 })
//             })

//             const buttons = new ActionRowBuilder().addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('up-shop-position')
//                     .setEmoji({name: '⬆️'})
//                     .setStyle(ButtonStyle.Primary)
//                     .setDisabled(newPos == 1),
//                 new ButtonBuilder()
//                     .setCustomId('down-shop-position')
//                     .setEmoji({name: '⬇️'})
//                     .setStyle(ButtonStyle.Primary)
//                     .setDisabled(newPos == shops.length),
//                 new ButtonBuilder()
//                     .setCustomId('submit-shop-new-pos')
//                     .setEmoji({name: '✅'})
//                     .setLabel(`Set position to ${newPos}`)
//                     .setStyle(ButtonStyle.Success)
//             )

//             await interaction.update({ content: `Change position of **[${shopName}]** to __**${newPos}**__`, components: [new ActionRowBuilder().addComponents(selectShopMenu), buttons], flags: MessageFlags.Ephemeral })
//         }
//     }

//     if (interaction.isButton()) {
//         if (interaction.customId === 'submit-shop-new-product') {
//             const shopName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, ''))
//             const productName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[0].replace(/\*/g, ''))
//             const productPrice = parseInt(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[1].replace(/\*/g, ''))
//             const productDescription = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[3]

//             let descString = (productDescription) ? productDescription.replace(/\*/g, '') : null

//             const selectedShop = shops.find(shop => shop.name === shopName)
//             if (selectedShop.products.length >= 23) return await interaction.update({ content: '❌ You can\'t add more than 23 products per shop', components: [] })

//             if (selectedShop.products.findIndex(product => product.name === productName) != -1) return await interaction.update({ content: '❌ This product already exist', components: [] })

//             try {
//                 selectedShop.products.push({name: productName, description: descString, id: uuid(), price: productPrice})
//                 selectedShop.products.sort((a, b) => a.price - b.price)
//                 await save(shops)
//                 await interaction.update({ content: `You succesfully added the product **${productName}** to **${shopName}** for **${productPrice}**, use \`/remove-product\` to remove it`, components: [] })
//             } catch (error) {
//                 console.log(error)
//                 await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//             }
//         }

//         if (interaction.customId === 'submit-currency-new-shop') {
//             const shopName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[0].replace(/\*/g, ''))
//             const currencyName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, ''))

//             try {
//                 shops.push({name: shopName, currency: currencyName, id: uuid(), products: []})

//                 let staffShop = shops.find(p => p.name === "Staff Shop")
//                 if (staffShop) {
//                     shops.splice(shops.indexOf(staffShop), 1)
//                     shops.push(staffShop)
//                 }

//                 await save(shops)
//                 await interaction.update({ content: `You succesfully created the shop **${shopName}** with the currency **${currencyName}**, use \`/remove-shop\` to remove it`, components: [] })
//             } catch (error) {
//                 console.log(error)
//                 await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//             }
//         }

//         if (interaction.customId === 'submit-currency-give') {
//             const target = interaction.message.mentions.members.first()
//             const amount = parseInt(interaction.message.content.match(/\*\*\d+\*\*/)[0].replace(/\*/g, ''))
//             const currencyName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, ''))

//             try {
//                 let account = accounts.find(account => account['user-id'] === target.id)
//                 if (!account) {
//                     try {
//                         accounts.push({'user-id': target.id, currencies: []})
//                         await save(accounts)
//                         account = accounts.find(account => account['user-id'] == target.id)
//                     } catch (error) {
//                         console.log(error)
//                         return await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//                     }
//                 }

//                 let currency = account.currencies.find(currency => currency.name === currencyName)
//                 let selectedCurrency = currencies.find(currency => currency.name === currencyName)

//                 if (currency) currency.amount += amount
//                 else account.currencies.push({ name: currencyName, id: selectedCurrency.id, amount: amount})
                
//                 await save(accounts)
//                 await interaction.update({ content: `You succesfully gave **${amount}** **${currencyName}** to ${target}, use \`/take\` to take it back`, components: [] })

//                 try {
//                     let logChannel = await interaction.guild.channels.fetch(config.logChannelId)
//                     await logChannel.send(`${interaction.member} gave **${amount}** **${currencyName}** to ${target}`)
//                 } catch (error) {
//                     console.log(error)
//                 }
//             } catch (error) {
//                 console.log(error)
//                 await interaction.reply({ content: `❌ An error occured while executing this command, please try again later`, flags: MessageFlags.Ephemeral })
//             }
//         }

//         if (interaction.customId === 'submit-currency-take') {
//             const target = interaction.message.mentions.members.first()
//             const amount = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[0].replace(/\*/g, '')
//             const currencyName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, ''))

//             const userAccount = accounts.find(account => account['user-id'] === target.id)
//             if (!userAccount) return await interaction.update({ content: '❌ This user has no account', components: [] })
            
//             const currencyToTake = userAccount.currencies.find(currency => currency.name == currencyName)
//             if (!currencyToTake) return await interaction.update({ content: '❌ This user doesn\'t have this currency', components: [] })

//             try {
//                 if (!isNaN(amount)) currencyToTake.amount -= Math.min(currencyToTake.amount, parseInt(amount))      
//                 else if (amount == 'All') currencyToTake.amount = 0
                
//                 if (currencyToTake.amount === 0) userAccount.currencies.splice(userAccount.currencies.indexOf(currencyToTake), 1)

//                 await save(accounts)
//                 await interaction.update({ content: `You succesfully took **${amount}** **${currencyName}** from ${target}'s account`, components: [] })
//                 try {
//                     let logChannel = await interaction.guild.channels.fetch(config.logChannelId)
//                     await logChannel.send(`${interaction.member} took **${amount}** **${currencyName}** from ${target}'s account`)
//                 } catch (error) {
//                     console.log(error)
//                 }
//             } catch (error) {
//                 console.log(error)
//                 await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//             }
//         }

//         if (interaction.customId === 'take-all-of-currency') {
//             const amount = interaction.message.content.match(/\*\*\d+\*\*/)[0].replace(/\*/g, '')

//             interaction.update(interaction.message.content.replace(`**${amount}**`, '**All**'))
//         }

//         if (interaction.customId === 'empty-account') {
//             const target = interaction.message.mentions.members.first()
//             const modal = new ModalBuilder()
//                 .setCustomId('empty-account-modal')
//                 .setTitle(`Empty ${target.user.username}'s account`)
            
//             const confirmEmptyInput = new TextInputBuilder()
//                 .setCustomId('confirm-empty-input')
//                 .setLabel('Please confirm emptying, it\'s non-reversible')
//                 .setPlaceholder('Yes')
//                 .setStyle(TextInputStyle.Short)
//                 .setRequired(true)

//             modal.addComponents(new ActionRowBuilder().addComponents(confirmEmptyInput))

//             await interaction.showModal(modal)
//         }
        

//         if (interaction.customId === 'submit-currency-remove') {
//             const currencyName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, ''))

//             try {
//                 currencies.splice(currencies.findIndex(currency => currency === currencyName), 1)
//                 const usersOwningCurrency = accounts.filter(account => account.currencies.findIndex(currency => currency.name === currencyName) != -1)
//                 usersOwningCurrency.forEach(user => {
//                     user.currencies.splice(user.currencies.findIndex(currency => currency.name === currencyName), 1)
//                 })
//                 const shopsUsingCurrency = shops.filter(shop => shop.currency.name === currencyName)
//                 shopsUsingCurrency.forEach(shop => {
//                     shops.splice(shops.indexOf(shop), 1)
//                 })
//                 await save(currencies)
//                 await save(shops)
//                 await save(accounts)

//                 await interaction.update({ content: `You succesfully removed **[${currencyName}]** as well as shops using this currency and took it from every accounts owning it`, components: [] })
//             } catch (error) {
//                 console.log(error)
//                 await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//             }
//         }
        
//         if (interaction.customId === 'submit-shop-remove') {
//             const shopName = interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, '')

//             try {
//                 shops.splice(shops.findIndex(shop => shop.name === shopName), 1)
//                 await save(shops)
//                 await interaction.update({ content: `You succesfully removed **[${shopName}]**`, components: [] })
//             } catch (error) {
//                 console.log(error)
//                 await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//             }
//         }

        
//         // remove product
//         if (interaction.customId === 'submit-shop-remove-product') {
//             const shopName = interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, '')
//             const selectedShop = shops.find(shop => shop.name === shopName)

//             if (!selectedShop.products.length) return await interaction.update({ content: `❌ There isn't any product in **${shopName}**`, components: [] })

//             const selectProductMenu = new StringSelectMenuBuilder()
//                 .setCustomId('select-product')
//                 .setPlaceholder('Select a product')

//             selectedShop.products.forEach(product => {
//                 selectProductMenu.addOptions({
//                     label: product.name.removeCustomEmojisString().cut(100),
//                     value: product.id
//                 })
//             })

//             const buttons = new ActionRowBuilder().addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('submit-product-remove-product')
//                     .setLabel('Remove Product')
//                     .setEmoji({name: '⛔'})
//                     .setStyle(ButtonStyle.Danger)
//                     .setDisabled(true),
//                 new ButtonBuilder()
//                     .setCustomId('change-shop-remove-product')
//                     .setLabel('Change Shop')
//                     .setStyle(ButtonStyle.Secondary)
//             )

//             await interaction.update({ content: `Remove **[Select Product]** from **${shopName}**`, components: [new ActionRowBuilder().addComponents(selectProductMenu), buttons] })
//         }

//         if (interaction.customId === 'change-shop-remove-product') {
//             const selectShopMenu = new StringSelectMenuBuilder()
//                 .setCustomId('select-shop')
//                 .setPlaceholder('Select a shop')
        
//             shops.forEach(shop => {
//                 selectShopMenu.addOptions({
//                     label: shop.name.removeCustomEmojisString().cut(100),
//                     value: shop.id
//                 })
//             })
        
//             const submitButton = new ActionRowBuilder().addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('submit-shop-remove-product')
//                     .setLabel('Submit Shop')
//                     .setEmoji({name: '✅'})
//                     .setStyle(ButtonStyle.Success)
//                     .setDisabled(true)
//             )

//             await interaction.update({ content: `Remove product from **[Select Shop]**`, components: [new ActionRowBuilder().addComponents(selectShopMenu), submitButton] })
//         }

//         if (interaction.customId === 'submit-product-remove-product') {
//             const productName = interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, '')
//             const shopName = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[1].replace(/\*/g, '')

//             try {
//                 const selectedShopProducts = shops.find(shop => shop.name === shopName).products
//                 selectedShopProducts.splice(selectedShopProducts.findIndex(product => product.name === productName))
//                 await save(shops)
//                 await interaction.update({ content: `You succesfully removed **[${productName}]** from **${shopName}**`, components: [] })
//             } catch (error) {
//                 console.log(error)
//                 await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//             }
//         }


//         // update product
//         if (interaction.customId === 'submit-shop-update-product') {
//             const shopName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, ''))
//             const updateOption = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[1].replace(/\*/g, '')
//             const updateOptionValue = replaceNonBreakableSpace(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[2].replace(/\*/g, ''))
//             const selectedShop = shops.find(shop => shop.name === shopName)

//             const selectProductMenu = new StringSelectMenuBuilder()
//                 .setCustomId('select-product')
//                 .setPlaceholder('Select a product')

//             if (!selectedShop.products.length) return await interaction.update({ content: `❌ There isn't any product in **${shopName}**`, components: [] })

//             selectedShop.products.forEach(product => {
//                 selectProductMenu.addOptions({
//                     label: product.name.removeCustomEmojisString().cut(100),
//                     value: product.id
//                 })
//             })

//             const buttons = new ActionRowBuilder().addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('submit-product-update-product')
//                     .setLabel('Update Product')
//                     .setEmoji({name: '✅'})
//                     .setStyle(ButtonStyle.Success)
//                     .setDisabled(true),
//                 new ButtonBuilder()
//                     .setCustomId('change-shop-update-product')
//                     .setLabel('Change Shop')
//                     .setStyle(ButtonStyle.Secondary)
//             )

//             interaction.update({ content: `Update **[Select Product]** from **${shopName}**. New **${updateOption}**: **${updateOptionValue}**`, components: [new ActionRowBuilder().addComponents(selectProductMenu), buttons] })
//         }

//         if (interaction.customId === 'change-shop-update-product') {
//             const updateOption = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[2].replace(/\*/g, '')
//             const updateOptionValue = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[3].replace(/\*/g, '')
//             const selectShopMenu = new StringSelectMenuBuilder()
//                 .setCustomId('select-shop')
//                 .setPlaceholder('Select a shop')
        
//             shops.forEach(shop => {
//                 selectShopMenu.addOptions({
//                     label: shop.name.removeCustomEmojisString().cut(100),
//                     value: shop.id
//                 })
//             })
        
//             const submitButton = new ActionRowBuilder().addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('submit-shop-update-product')
//                     .setLabel('Submit Shop')
//                     .setEmoji({name: '✅'})
//                     .setStyle(ButtonStyle.Success)
//                     .setDisabled(true)
//             )

//             interaction.update({ content: `Update product from **[Select Shop]**. New **${updateOption}**: **${updateOptionValue}**`, components: [new ActionRowBuilder().addComponents(selectShopMenu), submitButton] })
//         }

//         if (interaction.customId === 'submit-product-update-product') {
//             const productName = replaceNonBreakableSpace(interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, ''))
//             const shopName = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[1].replace(/\*/g, '')
//             const updateOption = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[2].replace(/\*/g, '')
//             const updateOptionValue = replaceNonBreakableSpace(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[3].replace(/\*/g, ''))

//             const selectedShop = shops.find(shop => shop.name === shopName)
//             const productToUpdtate = selectedShop.products.find(product => product.name === productName)

//             try {
//                 productToUpdtate[updateOption.toLowerCase()] = (updateOption == 'Price') ? parseInt(updateOptionValue) : updateOptionValue
//                 await save(shops)
//                 await interaction.update({ content: `You succesfully updated **[${productName}]** from **${shopName}**. New **${updateOption}**: **${updateOptionValue}**`, components: [] })
//             } catch (error) {
//                 console.log(error)
//                 await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//             }
//         }

//         // buy button
//         if (interaction.customId === 'buy-button') {
//             const shopName = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[0].replace(/\*/g, '')
//             const selectedShop = shops.find(shop => shop.name === shopName)

//             if (!selectedShop.products.length) return await interaction.reply({ content: `❌ There is no product in this shop`, components: [], flags: MessageFlags.Ephemeral })
                
//             const selectProductMenu = new StringSelectMenuBuilder()
//                 .setCustomId('select-product')
//                 .setPlaceholder('Select a product')

//             selectedShop.products.forEach(product => {
//                 selectProductMenu.addOptions({
//                     label: product.name.removeCustomEmojisString().cut(100),
//                     description: `${product.price} ${selectedShop.currency}`,
//                     value: product.id
//                 })
//             })

//             const buttons = new ActionRowBuilder().addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('submit-product-buy')
//                     .setLabel('Buy')
//                     .setEmoji({name: '✅'})
//                     .setStyle(ButtonStyle.Success)
//                     .setDisabled(true)
//             )

//             interaction.reply({ content: `Buy **[Select Product]** from **${shopName}**`, components: [new ActionRowBuilder().addComponents(selectProductMenu), buttons], flags: MessageFlags.Ephemeral })
//         }

//         //show account 
//         if (interaction.customId === 'show-account-button') {
//             const user = interaction.member 
//             let userAccount = accounts.find(account => account['user-id'] == user.id)

//             if (!userAccount) {
//                 try {
//                     accounts.push({'user-id': user.id, currencies: []})
//                     await fs.writeFile('./data/accounts.json', JSON.stringify(accounts, null, 4))
//                     userAccount = accounts.find(account => account['user-id'] == user.id)
//                 } catch (error) {
//                     console.log(error)
//                     return await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//                 }
//             }

//             const accountEmbed = new EmbedBuilder()
//                 .setTitle('💰 Your Account')
//                 .setDescription('Your balance:')
//                 .setColor('Gold')
//                 .setFooter({ text: 'ShopBot', iconURL: interaction.client.user.displayAvatarURL()})

//             if (userAccount.currencies.length) {
//                 userAccount.currencies.forEach(currency => {
//                     accountEmbed.addFields({name: currency.amount.toString(), value: currency.name, inline: true})
//                 })
//             }
//             else {
//                 accountEmbed.addFields({name: '\u200b', value: '**  ** ***❌ You don\'t have any money***\n** **'})
//             }


//             await interaction.reply({ content: `Here is your account:`, components: [], embeds: [accountEmbed], flags: MessageFlags.Ephemeral })
//         }


//         // buy
//         if (interaction.customId === 'submit-product-buy') {
//             const productName = interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, '')
//             const shopName = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[1].replace(/\*/g, '')

//             try {
//                 const userAccount = accounts.find(account => account['user-id'] === interaction.member.id)
//                 if (!userAccount) return await interaction.update({ content: `❌ You don't have any money`, components: [] })

//                 const selectedShop = shops.find(shop => shop.name === shopName)
//                 const productCurrencyUser = userAccount.currencies.find(currency => currency.name == selectedShop.currency)
//                 if (!productCurrencyUser) return await interaction.update({ content: `❌ You don't have enough **${selectedShop.currency}** to buy **${productName}** in **${shopName}**`, components: [] })
                
//                 const productPrice = selectedShop.products.find(product => product.name === productName).price

//                 if (productCurrencyUser.amount < productPrice) return await interaction.update({ content: `❌ You don't have enough **${selectedShop.currency} to buy **${productName}** in **${shopName}**`, components: [] })
//                 productCurrencyUser.amount -= productPrice

//                 try {
//                     let logChannel = await interaction.guild.channels.fetch(config.logChannelId)
//                     await logChannel.send(`${interaction.member} purchased **${productName}** from **${shopName}** for **${productPrice} ${productCurrencyUser.name}**`)
//                 } catch (error) {
//                     console.log(error)
//                 }

//                 await save(accounts)
//                 await interaction.update({ content: `You succesfully bought **${productName}** in **${shopName}**`, components: [] })
//             } catch (error) {
//                 console.log(error)
//                 await interaction.update({ content: '❌ An error has occured while executing this command, try again later', components: [] })
//             }
//         }

//         if (interaction.customId === 'change-shop-buy-product') {
//             const selectShopMenu = new StringSelectMenuBuilder()
//                 .setCustomId('select-shop')
//                 .setPlaceholder('Select a shop')
        
//             shops.forEach(shop => {
//                 selectShopMenu.addOptions({
//                     label: shop.name.removeCustomEmojisString().cut(100),
//                     value: shop.id
//                 })
//             })
        
//             const submitButton = new ActionRowBuilder().addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('submit-shop-buy-product')
//                     .setLabel('Submit Shop')
//                     .setEmoji({name: '✅'})
//                     .setStyle(ButtonStyle.Success)
//                     .setDisabled(true)
//             )

//             interaction.update({ content: `Buy a product in **[Selected Shop]**`, components: [new ActionRowBuilder().addComponents(selectShopMenu), submitButton] })
//         }


//         if (interaction.customId === 'change-shop-name') {
//             const shopName = interaction.message.content.match(/\*\*[^ ]+\*\*/g)[0].replace(/\*/g, '')

//             const modal = new ModalBuilder()
//                 .setCustomId('change-shop-name-modal')
//                 .setTitle('Change Shop Name')
            
//             const shopNameInput = new TextInputBuilder()
//                 .setCustomId('shop-name-input')
//                 .setLabel('New Shop Name')
//                 .setPlaceholder(shopName)
//                 .setStyle(TextInputStyle.Short)
//                 .setRequired(true)
//                 .setMaxLength(120)
//                 .setMinLength(1)

//             modal.addComponents(new ActionRowBuilder().addComponents(shopNameInput))

//             await interaction.showModal(modal)
//         }


//         if (interaction.customId === 'up-shop-position') {
//             const shopName = interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, '')
//             let newPos = parseInt(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[1].replace(/\*/g, ''))

//             newPos --

//             // set the disable state of up and down buttons
//             let upButton = interaction.message.components[1].components[0]
//                 upButton.data.disabled = newPos == 1
//             let downButton = interaction.message.components[1].components[1]
//                 downButton.data.disabled = newPos == shops.length
//             let submitButton = interaction.message.components[1].components[2]
//                 submitButton.data.label = `Set position to ${newPos}`

//             await interaction.update({ content: `Change position of **[${shopName}]** to __**${newPos}**__`, components: [interaction.message.components[0], new ActionRowBuilder().addComponents(upButton, downButton, submitButton)]})    
//         }   

//         if (interaction.customId === 'down-shop-position') {
//             const shopName = interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, '')
//             let newPos = parseInt(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[1].replace(/\*/g, ''))
            
//             newPos ++

//             // set the disable state of up and down buttons
//             let upButton = interaction.message.components[1].components[0]
//                 upButton.data.disabled = newPos == 1
//             let downButton = interaction.message.components[1].components[1]
//                 downButton.data.disabled = newPos == shops.length
//             let submitButton = interaction.message.components[1].components[2]
//                 submitButton.data.label = `Set position to ${newPos}`

//             await interaction.update({ content: `Change position of **[${shopName}]** to __**${newPos}**__`, components: [interaction.message.components[0], new ActionRowBuilder().addComponents(upButton, downButton, submitButton)]})    
//         }

//         if (interaction.customId === 'submit-shop-new-pos') {
//             const shopName = interaction.message.content.match(/\*\*\[[^ ]+\]\*\*/g)[0].replace(/\*|\[|\]/g, '')
//             const selectedShop = shops.find(shop => shop.name === shopName)

//             const oldPos = shops.indexOf(selectedShop)
//             const newPos = parseInt(interaction.message.content.match(/\*\*[^ ]+\*\*/g)[1].replace(/\*/g, ''))

//             shops.move(oldPos, newPos - 1)
//             save(shops)

//             await interaction.update({ content: `You succesfully changed **${shopName}**'s position to **${newPos}**`, components: [] })
//         }
//     }
}
