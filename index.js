const fs = require('node:fs');
const path = require('node:path');

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config/config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

Object.defineProperty(String.prototype, 'removeCustomEmojisString', {
    value: function () {
        return this.replace(/<:\w+:\d+>/g, '')
    },
    enumerable: false
});

Object.defineProperty(String.prototype, 'cut', {
    value: function (length) {
        if (this.length <= length) return this.valueOf()
		return this.substring(0, length - 1) + '…'
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'move', {
    value: function (old_index, new_index) {
        if (new_index >= this.length) {
            var k = new_index - this.length + 1;
            while (k--) {
                arr.push(undefined);
            }
        }
        this.splice(new_index, 0, this.splice(old_index, 1)[0]);
        return this;
    },
    enumerable: false
});

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(config.token);
