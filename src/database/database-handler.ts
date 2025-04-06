import { Snowflake } from 'discord.js'
import fs from 'node:fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { Account, AccountsDatabase, CurrenciesDatabase, Currency, CurrencyOptionsOptional, Database, DatabaseError, DatabaseErrors, Product, ProductOptions, ProductOptionsOptional, Shop, ShopOptionsOptional, ShopsDatabase } from "./database-types"

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
    
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)

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
    if (!account) throw new DatabaseError(DatabaseErrors.AccountDoesNotExist)

    if (empty === 'currencies' || empty === 'all') account.currencies.clear()
    if (empty === 'inventory' || empty === 'all') account.inventory.clear()

    await save(accountsDatabase)
}

export async function getAccountsWithCurrency(currencyId: string) {
    const accountsWithCurrency = new Map<Snowflake, Account>()
    accountsDatabase.accounts.forEach((account: Account, id: Snowflake) => {
        if (account.currencies.has(currencyId)) accountsWithCurrency.set(id, account)
    })
    return accountsWithCurrency
    
}

export async function takeCurrencyFromAccounts(currencyId: string) {
    const accountsWithCurrency = await getAccountsWithCurrency(currencyId)
    accountsWithCurrency.forEach(async (account: Account, id: Snowflake) => {
        account.currencies.delete(currencyId)
    })

    await save(accountsDatabase)
    return accountsWithCurrency
}

// #endregion

// #region CURRENCIES
export function getCurrencies(): Map<string, Currency> {
    return currenciesDatabase.currencies
}

export function getCurrencyId(currencyName: string): string | undefined {
    let currencyId: string | undefined = undefined
    currenciesDatabase.currencies.forEach(currency => {
        if (currency.name == currencyName) currencyId = currency.id
    })
    return currencyId 
}

export function getCurrencyName(currencyId: string | undefined): string | undefined {
    if (!currencyId) return undefined

    const currency = getCurrencies().get(currencyId)
    if (!currency) return undefined

    return `${currency.emoji != '' ? `${currency.emoji} ` : ''}${currency.name}`    
}

export async function createCurrency(currencyName: string, emoji: string) {
    if (currenciesDatabase.currencies.has(getCurrencyId(currencyName) || '')) throw new DatabaseError(DatabaseErrors.CurrencyAlreadyExists)
    
    const newCurrencyId = uuidv4()

    currenciesDatabase.currencies.set(newCurrencyId, { id: newCurrencyId, name: currencyName, emoji })
    save(currenciesDatabase)
}

export async function removeCurrency(currencyId: string) {
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)

    currenciesDatabase.currencies.delete(currencyId)
    save(currenciesDatabase)
}

export async function updateCurrency(currencyId: string, options: CurrencyOptionsOptional) {
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)
    
    const { name, emoji } = options

    const currency = currenciesDatabase.currencies.get(currencyId)!

    if (name) currency.name = name
    if (emoji) currency.emoji = emoji

    await save(currenciesDatabase)
}

// #endregion

// #region SHOPS
export function getShops(): Map<string, Shop> {
    return shopsDatabase.shops
}

export function getShopId(shopName: string): string | undefined {
    let shopId: string | undefined = undefined
    shopsDatabase.shops.forEach(shop => {
        if (shop.name === shopName) shopId = shop.id
    })
    return shopId
}
export function getShopName(shopId: string | undefined): string | undefined {
    if (!shopId) return undefined
    const shop = getShops().get(shopId)
    if (!shop) return undefined

    return `${shop.emoji != '' ? `${shop.emoji} ` : ''}${shop.name}`
}

export async function createShop(shopName: string, description: string, currencyId: string, emoji: string) {
    if (shopsDatabase.shops.has(getShopId(shopName) || '')) throw new DatabaseError(DatabaseErrors.ShopAlreadyExists)
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)

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

    await save(shopsDatabase)

    return shopsDatabase.shops.get(newShopId)!
}

export async function removeShop(shopId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    shopsDatabase.shops.delete(shopId)
    save(shopsDatabase)
}


export async function updateShop(shopId: string, options: ShopOptionsOptional) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)
    
    const { name, description, emoji } = options

    const shop = shopsDatabase.shops.get(shopId)!

    if (name) shop.name = name
    if (description) shop.description = description
    if (emoji) shop.emoji = emoji

    await save(shopsDatabase)
}

export async function updateShopCurrency(shopId: string, currencyId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)
    
    const shop = shopsDatabase.shops.get(shopId)!

    shop.currency = currenciesDatabase.currencies.get(currencyId)!

    await save(shopsDatabase)
}

export function getShopsWithCurrency(currencyId: string) {
    const shopsWithCurrency: Map<string, Shop> = new Map()

    shopsDatabase.shops.forEach((shop: Shop, shopId: string) => {
        if (shop.currency.id == currencyId) {
            shopsWithCurrency.set(shopId, shop)
        } 
    })
    return shopsWithCurrency
}


export function updateShopPosition(shopId: string, index: number) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)
    if (index < 0 || index > shopsDatabase.shops.size - 1) throw new DatabaseError(DatabaseErrors.InvalidPosition)

    const shopsArray = Array.from(shopsDatabase.shops.entries())
    const shopIndex = shopsArray.findIndex(([id, _shop]) => id === shopId)

    if (shopIndex === -1) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    shopsArray.splice(index, 0, shopsArray.splice(shopIndex, 1)[0]);
    
    shopsDatabase.shops = new Map(shopsArray)
    save(shopsDatabase)
}

export async function createDiscountCode(shopId: string, discountCode: string, discountAmount: number) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    shopsDatabase.shops.get(shopId)!.discountCodes[discountCode] = discountAmount
    await save(shopsDatabase)
}

export async function removeDiscountCode(shopId: string, discountCode: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    delete shopsDatabase.shops.get(shopId)!.discountCodes[discountCode]
    await save(shopsDatabase)
}
// #endregion

// #region PRODUCTS
export function getProducts(shopId: string): Map<string, Product> {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    return shopsDatabase.shops.get(shopId)!.products
}

export async function addProduct(shopId: string, options: ProductOptions) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    const id = uuidv4()
    const product = Object.assign({ id, shopId }, options)

    shopsDatabase.shops.get(shopId)!.products.set(id, product)
    await save(shopsDatabase)

    return shopsDatabase.shops.get(shopId)!.products.get(id)!
}

export async function removeProduct(shopId: string, productId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    shopsDatabase.shops.get(shopId)!.products.delete(productId)
    await save(shopsDatabase)
}
export async function updateProduct(shopId: string, productId: string, options: ProductOptionsOptional) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)
    
    const { name, description, price, emoji, action } = options
    const product = shopsDatabase.shops.get(shopId)!.products.get(productId)

    if (!product) throw new DatabaseError(DatabaseErrors.ProductDoesNotExist)

    if (name) product.name = name
    if (description) product.description = description
    if (price) product.price = price
    if (emoji) product.emoji = emoji
    if (action) product.action = action

    await save(shopsDatabase)
}

export function getProductName(shopId: string | undefined, productId: string | undefined): string | undefined {
    if (!shopId || !productId) return undefined

    const product = getShops().get(shopId)?.products.get(productId)
    if (!product) return undefined

    return `${product.emoji != '' ? `${product.emoji} ` : ''}${product.name}`    
}
// #endregion
