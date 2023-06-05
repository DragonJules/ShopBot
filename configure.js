const fs = require('node:fs/promises')
const prompts = require('prompts');
const opn = require('opn')


const config = require('./config/config.json')

let configure = async () => {

    const response = await prompts([{
        type: 'text',
        name: 'id',
        message: 'Please enter the ID of your bot: '
    },
    {
        type: 'text',
        name: 'token',
        message: 'Please enter the Token of your bot: '
    }
    ]);

    config.clientId = response.id.toString()
    config.token = response.token

    await fs.writeFile('./config/config.json', JSON.stringify(config, null, 4))


    let discloudConfigFile = (await fs.readFile('./discloud.config')).toString()
    discloudConfigFile = discloudConfigFile.replace('%id%', config.clientId)
    await fs.writeFile('./discloud.config', discloudConfigFile)

    opn(`https://discord.com/oauth2/authorize?client_id=${config.clientId}&scope=bot&permissions=8`);
}

configure()
