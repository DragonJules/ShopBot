module.exports = {
	name: 'guildCreate',
	once: true,
	execute(guild) {
		console.log(`Client joined new server`);
		require('../deploy-commands.js').deployCommands(guild.id)
	},
};