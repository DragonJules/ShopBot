export const EMOJI_REGEX = /<a?:.+?:\d{18,}>|\p{Extended_Pictographic}/gu

export enum ErrorMessages {
    InvalidSubcommand = 'Invalid subcommand',
    NoShops = 'There isn\'t any shop.\n-# Use `/shops-manage create` to create a new one',
    InsufficientParameters = 'Insufficient parameters',
    NoCurrencies = 'There isn\'t any currency.\n-# Use `/currencies-manage create` to create a new currency',
    NotOnlyEmojisInName = 'The name can\'t contain only custom emojis',
    NoProducts = 'The selected shop has no products'
}