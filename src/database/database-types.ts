import { Snowflake } from "discord.js"

export class DatabaseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "DatabaseError"
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}

export interface DatabaseJSONBody {}

export abstract class Database {
    public path: string

    public constructor (databaseRaw: DatabaseJSONBody, path: string) {
        this.path = path
    }
    
    public abstract toJSON(): DatabaseJSONBody 
    
    protected abstract parseRaw(databaseRaw: DatabaseJSONBody): unknown 
}

export interface Currency {
    id: string
    name: string
    emoji: string
}

export interface Product {
    id: string
    shopId: string
    name: string
    emoji: string
    description: string
    price: number
}

export type ProductOptions = Omit<Product, 'id' | 'shopId'>

export type ProductOptionsOptional = Partial<ProductOptions>

export interface Balance<Item> {
    item: Item
    amount: number
}

export interface Account {
    currencies: Map<string, Balance<Currency>>
    inventory: Map<string, Balance<Product>>
}

export interface AccountsDatabaseJSONBody extends DatabaseJSONBody {
    [userId: Snowflake]: {
        currencies: {[currencyId: string]: Balance<Currency>},
        inventory: {[productId: string]: Balance<Product>}
    }
}


export class AccountsDatabase extends Database {
    public accounts: Map<Snowflake, Account>

    public constructor (databaseRaw: AccountsDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.accounts = this.parseRaw(databaseRaw)
    }

    public toJSON(): AccountsDatabaseJSONBody {
        const accountsJSON: AccountsDatabaseJSONBody = {}

        this.accounts.forEach((account, userId) => {
            accountsJSON[userId] = { currencies: Object.fromEntries(account.currencies), inventory: Object.fromEntries(account.inventory) }
        })

        return accountsJSON
    }

    protected parseRaw(databaseRaw: AccountsDatabaseJSONBody): Map<Snowflake, Account> {
        const accounts: Map<Snowflake, Account> = new Map()

        for (const [userId, { currencies, inventory }] of Object.entries(databaseRaw)) {
            accounts.set(userId, { currencies: new Map(Object.entries(currencies)), inventory: new Map(Object.entries(inventory)) })
        }

        return accounts
    }

}

export interface CurrenciesDatabaseJSONBody extends DatabaseJSONBody {
    [currencyId: Snowflake]: Currency
}


export class CurrenciesDatabase extends Database {
    public currencies: Map<string, Currency>

    public constructor (databaseRaw: CurrenciesDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.currencies = this.parseRaw(databaseRaw)
    }

    public toJSON(): CurrenciesDatabaseJSONBody {
        const currencies: CurrenciesDatabaseJSONBody = Object.fromEntries(this.currencies)
        return currencies
    }

    protected parseRaw(databaseRaw: CurrenciesDatabaseJSONBody): Map<string, Currency> {
        return new Map(Object.entries(databaseRaw))
    }
}

export interface Shop {
    id: string
    name: string
    emoji: string
    description: string
    currency: Currency
    discountCodes: {[code: string]: number}
    products: Map<string, Product>
}

export interface ShopsDatabaseJSONBody extends DatabaseJSONBody {
    [shopId: Snowflake]: Omit<Shop, 'products'> & { products: {[productId: string]: Product} }
}

export class ShopsDatabase extends Database {
    public shops: Map<string, Shop>

    public constructor (databaseRaw: ShopsDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.shops = this.parseRaw(databaseRaw)
    }

    public toJSON(): ShopsDatabaseJSONBody {
        const shopsJSON: ShopsDatabaseJSONBody = {}

        this.shops.forEach((shop, shopId) => {
            shopsJSON[shopId] = { ...shop, products: Object.fromEntries(shop.products) }
        })

        return shopsJSON
    }

    protected parseRaw(databaseRaw: ShopsDatabaseJSONBody): Map<string, Shop> {
        const shops: Map<string, Shop> = new Map()

        for (const [shopId, shop] of Object.entries(databaseRaw)) {
            shops.set(shopId, { ...shop, products: new Map(Object.entries(shop.products)) })
        }

        return shops
    }

}