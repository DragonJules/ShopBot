interface String {
    ellipsis(max: number) : string
    removeCustomEmojis() : string
    replaceSpaces(by?: string) : string
}

String.prototype.ellipsis = function (this : string, max: number) {
    const str = this
    if (str.length > max) return `${str.substring(0, max - 1)}…`

    return str
}

String.prototype.removeCustomEmojis = function (this: string): string {
    const str = this
    return str.replace(/<:[a-zA-Z0-9_]{2,32}:[0-9]{17,19}>/g, '')
}

String.prototype.replaceSpaces = function (this: string, by: ' '): string{
    const str = this
    return str.replace(/[\s ]/g, ' ')
} 
