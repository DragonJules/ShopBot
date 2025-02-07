import { Snowflake } from 'discord.js'
import { Account, AccountsDatabase, CurrenciesDatabase, Currency, Database, DatabaseError, Shop, ShopsDatabase } from "./database-types"
import fs from 'node:fs/promises'
import { v4 as uuidv4 } from 'uuid';

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

const accountsDatabase = new AccountsDatabase(accounts, 'data/accounts.json')
const currenciesDatabase = new CurrenciesDatabase(currencies, 'data/currencies.json')
const shopsDatabase = new ShopsDatabase(shops, 'data/shops.json')

/**
 * What this needs to handle :
 * ✅ 1. get and return account 
 * ✅ 2. create account
 * ✅ 3. update account (money and inv)
 * ✅4. create and remove currency
 * 5. create, update and remove product
 * ✅6. create and remove shop
 * 7. reorder shops
 * 8. get and return shops
 */


export async function getOrCreateAccount(id: Snowflake): Promise<Account> {
    let account = accountsDatabase.accounts.get(id)

    if (!account) {
        accountsDatabase.accounts.set(id, { currencies: [], inventory: [] })
        await save(accountsDatabase)
        account = accountsDatabase.accounts.get(id)!
    }

    return account
}

export async function setAccountCurrencyAmount(id: Snowflake, currencyId: string, amount: number) {
    const account = await getOrCreateAccount(id)
    
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError('Currency does not exist')

    let currencyBalance = account.currencies.find(balance => balance.item.id === currencyId)

    if (!currencyBalance) {
        account.currencies.push(
            { 
                item: { 
                    id: currencyId, 
                    name: getCurrencyName(currencyId)! 
                }, 
                amount 
            }
        )
    } else {
        currencyBalance.amount = amount
    }

    await save(accountsDatabase)
}

export async function setAccountItemAmount(id: Snowflake, productId: string, amount: number) {
    const account = await getOrCreateAccount(id)
    let productBalance = account.inventory.find(balance => balance.item.id === productId)

    if (!productBalance) return

    productBalance.amount = amount
    await save(accountsDatabase)
}

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

export async function createCurrency(currencyName: string) {
    if (currenciesDatabase.currencies.has(getCurrencyId(currencyName) || '')) throw new DatabaseError('Currency already exists')
    
    const newCurrencyId = uuidv4()

    currenciesDatabase.currencies.set(newCurrencyId, { id: newCurrencyId, name: currencyName })
    save(currenciesDatabase)
}

export async function removeCurrency(currencyId: string) {
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError('Currency does not exist')

    currenciesDatabase.currencies.delete(currencyId)
    save(currenciesDatabase)
}

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

export async function createShop(shopName: string, description: string, currencyId: string) {
    if (shopsDatabase.shops.has(getShopId(shopName) || '')) throw new DatabaseError('Shop already exists')
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError('Currency does not exist')

    const newShopId = uuidv4()    

    shopsDatabase.shops.set(newShopId, { 
        id: newShopId, 
        name: shopName, 
        description,
        currency: currenciesDatabase.currencies.get(currencyId)!,
        products: []
    })

    save(shopsDatabase)
}

export async function removeShop(shopId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError('Shop does not exist')

    shopsDatabase.shops.delete(shopId)
    save(shopsDatabase)
}
