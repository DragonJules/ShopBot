import fs from 'node:fs/promises'

import wait from 'node:timers/promises'
import config from '../../config/config.json'

import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, Interaction, Client, ChannelType, InteractionType, ModalSubmitInteraction, StringSelectMenuInteraction, ButtonInteraction, BaseInteraction } from 'discord.js'
import { PrettyLog } from '../utils/pretty-log'
import { replyErrorMessage } from '../utils/utils'
import { ChatInputCommandInteraction } from 'discord.js'


/**
 * What this should do:
 * 1. handle interactions of type:
 *     a. slash command
 *     b. modal
 *     c. string select menu
 * 
 */

export const name = 'interactionCreate'

export async function execute(interaction: BaseInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) return
    if (interaction.user.bot) return
    
    const client = interaction.client

    if (interaction.isChatInputCommand()) {
        handleSlashCommand(interaction)
        return
    }

    if (interaction.isStringSelectMenu()) {
        handleStringSelectMenu(interaction)
        return
    }

    if (interaction.isModalSubmit()) {
        handleModalSubmit(interaction)
        return
    }
    
    if (interaction.isButton()) {
        handleButton(interaction)
        return
    }
}


function handleSlashCommand(interaction: ChatInputCommandInteraction) {

}

function handleModalSubmit(interaction: ModalSubmitInteraction) {
    
}

function handleStringSelectMenu(interaction: StringSelectMenuInteraction) {
    
}

function handleButton(interaction: ButtonInteraction) {

}