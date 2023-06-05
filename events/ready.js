module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		require('../deploy-commands.js').deployCommands('1085750580242305175')
	},
};