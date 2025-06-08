import { Snowflake } from "discord.js"
import accounts from '../../../data/accounts.json'
import { getCurrencies } from "../currencies/currencies-database"
import { save } from "../database-handler"
import { DatabaseError, DatabaseErrors } from "../database-types"
import { Product } from "../shops/shops-types"
import { Account, AccountsDatabase } from "./accounts-type"

const accountsDatabase = new AccountsDatabase(accounts, 'data/accounts.json')

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
    
    if (!getCurrencies().has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)

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
