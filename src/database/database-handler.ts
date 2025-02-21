import { Snowflake } from 'discord.js'
import { Account, AccountsDatabase, CurrenciesDatabase, Currency, Database, DatabaseError, Product, ProductOptions, ProductOptionsOptional, Shop, ShopsDatabase } from "./database-types"
import fs from 'node:fs/promises'
import { v4 as uuidv4 } from 'uuid'

import accounts from '../../data/accounts.json'
import currencies from '../../data/currencies.json'
import shops from '../../data/shops.json'

const save = (database: Database) => new Promise<boolean>(async (resolve, reject) => {
    try {
        await fs.writeFile(database.path, JSON.stringify(database.toJSON(), null, 4))

        resolve(true)
    } catch (error) {
        resolve(false)
    }
})

const currenciesDatabase = new CurrenciesDatabase(currencies, 'data/currencies.json')
const shopsDatabase = new ShopsDatabase(shops, 'data/shops.json')
const accountsDatabase = new AccountsDatabase(accounts, 'data/accounts.json')

// #region ACCOUNTS
export async function getOrCreateAccount(id: Snowflake): Promise<Account> {
    let account = accountsDatabase.accounts.get(id)

    if (!account) {
        accountsDatabase.accounts.set(id, { currencies: new Map(), inventory: new Map() })
        await save(accountsDatabase)
        account = accountsDatabase.accounts.get(id)!
    }

    return account
}

export async function setAccountCurrencyAmount(id: Snowflake, currencyId: string, amount: number) {
    const account = await getOrCreateAccount(id)
    
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError('Currency does not exist')

    const currencyBalance = account.currencies.get(currencyId)

    if (!currencyBalance) {
        const currency = getCurrencies().get(currencyId)!
        account.currencies.set(currencyId, 
            { 
                item: { 
                    id: currencyId, 
                    name: currency.name,
                    emoji: currency.emoji
                }, 
                amount: +amount.toFixed(2)
            }
        )
    } else {
        currencyBalance.amount = +amount.toFixed(2)
    }

    await save(accountsDatabase)
}

export async function setAccountItemAmount(id: Snowflake, product: Product, amount: number) {
    const account = await getOrCreateAccount(id)
    let productBalance = account.inventory.get(product.id)

    if (!productBalance) {
        account.inventory.set(product.id, 
            { 
                item: product, 
                amount 
            }
        )
    }
    else {
        productBalance.amount = amount
    }

    await save(accountsDatabase)
}

export async function emptyAccount(id: Snowflake, empty: 'currencies' | 'inventory' | 'all') {
    const account = accountsDatabase.accounts.get(id)
    if (!account) throw new DatabaseError('Account does not exist')

    if (empty === 'currencies' || empty === 'all') account.currencies.clear()
    if (empty === 'inventory' || empty === 'all') account.inventory.clear()

    await save(accountsDatabase)
}
// #endregion


// #region CURRENCIES
export function getCurrencies(): Map<string, Currency> {
    return currenciesDatabase.currencies
}

export function getCurrencyId(currencyName: string): string | undefined {
    let currencyId: string | undefined = undefined
    currenciesDatabase.currencies.forEach(currency => {
        if (currency.name == currencyName) return currencyId = currency.id
    })
    return currencyId 
}

export function getCurrencyName(currencyId: string): string | undefined {
    return currenciesDatabase.currencies.get(currencyId)?.name
}

export async function createCurrency(currencyName: string, emoji: string) {
    if (currenciesDatabase.currencies.has(getCurrencyId(currencyName) || '')) throw new DatabaseError('Currency already exists')
    
    const newCurrencyId = uuidv4()

    currenciesDatabase.currencies.set(newCurrencyId, { id: newCurrencyId, name: currencyName, emoji })
    save(currenciesDatabase)
}

export async function removeCurrency(currencyId: string) {
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError('Currency does not exist')

    currenciesDatabase.currencies.delete(currencyId)
    save(currenciesDatabase)
}

// TODO update currencies functions

// #endregion

// #region SHOPS
export function getShops(): Map<string, Shop> {
    return shopsDatabase.shops
}

export function getShopId(shopName: string): string | undefined {
    shopsDatabase.shops.forEach(shop => {
        if (shop.name === shopName) return shop.id
    })
    return undefined
}

export function getShopName(shopId: string): string | undefined {
    return shopsDatabase.shops.get(shopId)?.name
}

export async function createShop(shopName: string, description: string, currencyId: string, emoji: string) {
    if (shopsDatabase.shops.has(getShopId(shopName) || '')) throw new DatabaseError('Shop already exists')
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError('Currency does not exist')

    const newShopId = uuidv4()    

    shopsDatabase.shops.set(newShopId, { 
        id: newShopId, 
        name: shopName, 
        emoji,
        description,
        currency: currenciesDatabase.currencies.get(currencyId)!,
        discountCodes: {},
        products: new Map()
    })

    save(shopsDatabase)
}

export async function removeShop(shopId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    shopsDatabase.shops.delete(shopId)
    save(shopsDatabase)
}

export async function updateShopName(shopId: string, name: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    shopsDatabase.shops.get(shopId)!.name = name
    await save(shopsDatabase)
}

export async function updateShopDescription(shopId: string, description: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    shopsDatabase.shops.get(shopId)!.description = description
    await save(shopsDatabase)
}

export async function updateShopEmoji(shopId: string, emoji: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    shopsDatabase.shops.get(shopId)!.emoji = emoji
    await save(shopsDatabase)
}


export function updateShopPosition(shopId: string, index: number) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')
    if (index < 0 || index > shopsDatabase.shops.size - 1) throw new DatabaseError('Invalid position')

    const shopsArray = Array.from(shopsDatabase.shops.entries())
    const shopIndex = shopsArray.findIndex(([id, _shop]) => id === shopId)

    if (shopIndex === -1) throw new DatabaseError('Shop does not exist')

    shopsArray.splice(index, 0, shopsArray.splice(shopIndex, 1)[0]);
    
    shopsDatabase.shops = new Map(shopsArray)
    save(shopsDatabase)
}

export async function createDiscountCode(shopId: string, discountCode: string, discountAmount: number) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    shopsDatabase.shops.get(shopId)!.discountCodes[discountCode] = discountAmount
    await save(shopsDatabase)
}

export async function removeDiscountCode(shopId: string, discountCode: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    delete shopsDatabase.shops.get(shopId)!.discountCodes[discountCode]
    await save(shopsDatabase)
}
// #endregion

// #region PRODUCTS
export function getProducts(shopId: string): Map<string, Product> {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    return shopsDatabase.shops.get(shopId)!.products
}

export async function addProduct(shopId: string, options: ProductOptions) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    const { name, description, price, emoji } = options
    const id = uuidv4()

    shopsDatabase.shops.get(shopId)!.products.set(id, { id, shopId, name, emoji, description, price })
    await save(shopsDatabase)
}

export async function removeProduct(shopId: string, productId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    shopsDatabase.shops.get(shopId)!.products.delete(productId)
    await save(shopsDatabase)
}
export async function updateProduct(shopId: string, productId: string, options: ProductOptionsOptional) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')
    
    const { name, description, price, emoji } = options
    const product = shopsDatabase.shops.get(shopId)!.products.get(productId)

    if (!product) throw new DatabaseError('Product does not exist')

    if (name) product.name = name
    if (description) product.description = description
    if (price) product.price = price
    if (emoji) product.emoji = emoji

    await save(shopsDatabase)
}
// #endregion
