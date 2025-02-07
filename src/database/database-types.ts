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
}

export interface Product {
    id: string
    name: string
    description: string
    price: number
}

export interface Balance<Item> {
    item: Item
    amount: number
}

export interface Account {
    currencies: Balance<Currency>[]
    inventory: Balance<Product>[]
}

export interface AccountsDatabaseJSONBody extends DatabaseJSONBody {
    [userId: Snowflake]: Account
}


export class AccountsDatabase extends Database {
    public accounts: Map<Snowflake, Account>

    public constructor (databaseRaw: AccountsDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.accounts = this.parseRaw(databaseRaw)
    }

    public toJSON(): AccountsDatabaseJSONBody {
        const accounts: AccountsDatabaseJSONBody = Object.fromEntries(this.accounts)
        return accounts
    }

    protected parseRaw(databaseRaw: AccountsDatabaseJSONBody): Map<Snowflake, Account> {
        return new Map(Object.entries(databaseRaw))
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

    protected parseRaw(databaseRaw: DatabaseJSONBody): Map<string, Currency> {
        return new Map(Object.entries(databaseRaw))
    }
}

export interface Shop {
    id: string
    name: string
    description: string
    currency: Currency
    products: Product[]
}

export interface ShopsDatabaseJSONBody extends DatabaseJSONBody {
    [shopId: Snowflake]: Shop
}

export class ShopsDatabase extends Database {
    public shops: Map<string, Shop>

    public constructor (databaseRaw: DatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.shops = this.parseRaw(databaseRaw)
    }

    public toJSON(): ShopsDatabaseJSONBody {
        const shops: ShopsDatabaseJSONBody = Object.fromEntries(this.shops)
        return shops
    }

    protected parseRaw(databaseRaw: DatabaseJSONBody): Map<string, Shop> {
        return new Map(Object.entries(databaseRaw))
    }

}