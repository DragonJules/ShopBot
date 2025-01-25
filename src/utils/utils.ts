import { ChatInputCommandInteraction, MessageFlags } from "discord.js"

export function removeCustomEmojisString(str: string | undefined | null): string {
    if (!str) return ''
    return str.replace(/<:[a-zA-Z0-9_]{2,32}:[0-9]{17,19}>/g, '')
}

export function replaceNonBreakableSpace(str: string | undefined | null): string | undefined {
    if (!str) return undefined
    return str.replace(/[\s ]/g, ' ')
}

export async function replyErrorMessage(interaction: ChatInputCommandInteraction, errorMessage?: string) {
    const message = `❌ ${errorMessage ? errorMessage : 'An error occured while executing this command, please try again later'}`

    return await interaction.reply({ content: message, flags: MessageFlags.Ephemeral })
}

export function ellipsis(str: string, max: number) {
    if (str.length > max) return `${str.substring(0, max - 1)}…`

    return str
}