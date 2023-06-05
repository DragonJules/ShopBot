# ShopBot

### Summary:
- [Introduction](#introduction)
- [How to configure](#how-to-configure)
- [How to host](#how-to-host)
- [Commands](#commands)
- [Screenshots](#screenshots)
---
## Introduction

Hi, I coded a cool bot for you.
Let me introduce you **ShopBot**, this bot aims at helping you create your own shops and currencies to fit the needs of your community, your RP server, or anything you need.     
<sub><sup>(See [screenshots](#screenshots))</sup></sub>
<br>

### Here is what the bot can do:

This bot uses the power of ***Slash Commands*** to let you interact with it with the **best UI** as possible (Embeds, Buttons, Select Menu). So you will **not have to worry** about remembering compex commands, the **bot does everything** for you, and prevents you from accidentally making errors.


You can **create** **currencies**, then use them in **shops** you created, in which you can add **products**, with a name, a description and a price.

Of course, you can **manage** these currencies, shops and products. You can **delete** the currencies and the shops.
You can **update** the name, description or price of the products.

Admins can **give** and **take** money to users and even **empty** an account, they can also **see** the account of anyone.
They can see logs (for purchase, give and take) by setting a log channel on your server.

Users can **see** their own account, and **buy** in shops.

<br>

Thanks to **Discord**'s features, you can customize the permissions for each command in the settings of your server.

You can check [screenshots](#screenshots) of the bot's commands to see how cool it is :D

<br>

If you love the bot, feel free to support me: 

<a href='https://ko-fi.com/itzdragon'><img src='https://ko-fi.com/img/githubbutton_sm.svg' height="27px"/></a>
<br>
<br>

---
<br>
Now, let's configure your bot, caution, you need to do it carefully


<br>


## How to configure

First, you need to create a bot on the [Discord Developer Portal](https://discord.com/developers/applications):

<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109839595606122617/image.png" width="805px"/>

Follow the instructions, choose a name, accept ToS, then open the `Bot` tab, `Add Bot` and confirm: <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109836792137515138/image.png" height="200px"/><img src="https://cdn.discordapp.com/attachments/828211235853434890/1109841614660186242/image.png" height="200px"/>

Feel free to customize your bot's settings, like name or profile picture.

<br>
Then, download the <a href="https://github.com/DragonJules/ShopBot/archive/refs/heads/main.zip">code<a/>, and alongside install <a href="https://nodejs.org">Node.JS<a/> : <br>

<img src="https://i.ibb.co/RHkSGCT/image.png" height="230px"/>     <img src="https://i.ibb.co/mbpYjy4/image.png" height="230px"/> <br>

Once the **code** is downloaded, unzip it in a folder of your choice.

Once **Node.JS** is installed, navigate to the folder where you put the bot's file.
Open the command prompt from this path, and execute the following commands:

```bash
npm i
```
```bash
node index.js
```

It will ask you the `id` and the `token` of the bot, which you can find in the [Discord Developer Portal](https://discord.com/developers/applications):

You can find the ID here: <br>
<img src="https://i.ibb.co/R0xvPMX/image.png" height="250px"/><img src="https://cdn.discordapp.com/attachments/828211235853434890/1109840610728349746/image.png" height="250px"/>

You can find the Token here: <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109836792137515138/image.png" height="271px"/><img src="https://cdn.discordapp.com/attachments/828211235853434890/1109836676135649410/image.png" height="271px"/> <br>
Click on `Reset Token` and then click `Copy`: <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109836504265670676/image.png" width="615px"/> <br>

Then put the value you copied in the `configure/index.js`: <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109837889384239196/image.png" width="615px"/>

<br>

It will then automatically open your browser and ask you to select a `Discord Server` you want the Bot on.
<br>

---
## How to host

**I will here present a way of hosting your bot, for free.** But if you have another solution to do it, feel free to use it. If you use another solution, just keep in mind that I used a local database, so for the bot to work, the infrastructure must let it change content of files (`data/accounts.json`, `data/currenies.json`, `data/shops.json`). Otherwise, you can change the database system.

First, open the folder of your bot and select the following: <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1115355676068294727/image.png" width="400px"/> <br>
And zip them.

<br>

Then, join the [Discloud Server](https://discord.gg/rktxF6hgYg), follow server's instructions, and go to the commands channel: <br>
<img src="https://cdn.discordapp.com/attachments/1109845198147702896/1109845264908427264/image.png" width="200px"/> <br>
Send the command `.upc` in the channel and follow the instructions (you will be asked to join another channel and send the zip file)

When it's done uploading, come back to the commands channel and send the command `.start`. Hopefully, the bot will start, if not, open an [issue on Github](https://github.com/DragonJules/ShopBot/issues)

<br>

---

## Commands

#### Here are all the commands available for the bot.

**Commands for everyone:** <br>

*• Shows the account*
  `/account` <br>
 
*• Displays the shops*
  `/shop` 

<br>

**Admin commands:**
`/set-log-channel`

*• Creation commands*
    `/create-currency`
    `/create-shop` 
    `/add-product`

*• Update commands*
    `/update-product`
    `/reorder-shops`

*• Remove commands*
    `/remove-currency`
    `/remove-shop`
    `/remove-product`

*• User management commands*
    `/give`
    `/take`
    `/display-account`


## Screenshots 



##### What members of the discord can see:
Shop <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109862521495625728/image.png" height="320px"/>   <br>
Buy | Account <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109863331562524731/image.png" height="200px"/>   <img src="https://cdn.discordapp.com/attachments/828211235853434890/1109862873318051982/image.png" height="200px"/>

<br>

##### Examples of what you as an administrator can see:
Create | Delete a currency: <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109864095705989171/image.png" height="120px"/> <img src="https://cdn.discordapp.com/attachments/828211235853434890/1109864226656354315/image.png" height="120px"/> 

Create | Delete a shop: <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109866850403233904/image.png" height="166px"/> <img src="https://cdn.discordapp.com/attachments/828211235853434890/1109866859966255185/image.png" height="166px"/> 


Configuring bot's commands permissions: <br>
<img src="https://cdn.discordapp.com/attachments/828211235853434890/1109870248070500413/image.png" height="290px"/> <img src="https://cdn.discordapp.com/attachments/828211235853434890/1109871514267963524/image.png" height="290px"/>


<sub><sup>The screenshots come from the project I originally created the bot for.</sup></sub>


If something is missing in this document, please open an [issue](https://github.com/DragonJules/ShopBot/issues).
