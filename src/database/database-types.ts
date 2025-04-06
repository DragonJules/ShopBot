import { Snowflake } from "discord.js";
import { getCurrencies, getProducts, getShops } from "./database-handler";

export type UUID = string

export enum DatabaseErrors {
    ShopDoesNotExist = 'Shop does not exist',
    ShopAlreadyExists = 'Shop already exists',
    InvalidPosition = 'Invalid position',

    CurrencyDoesNotExist = 'Currency does not exist',
    CurrencyAlreadyExists = 'Currency already exists',

    ProductDoesNotExist = 'Product does not exist',

    AccountDoesNotExist = 'Account does not exist',
}

export class DatabaseError extends Error {
    constructor(message: DatabaseErrors) {
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
    id: UUID
    name: string
    emoji: string
}

export type CurrencyOptions = Omit<Currency, 'id'>
export type CurrencyOptionsOptional = Partial<CurrencyOptions>

export enum ProductActionType {
    GiveRole = 'give-role',
    GiveCurrency = 'give-currency'
}

export type ProductActionOptions<Type extends ProductActionType> = 
    Type extends ProductActionType.GiveRole ? { roleId: Snowflake } :
    Type extends ProductActionType.GiveCurrency ? { currencyId: UUID, amount: number } :
    never;

export type ProductAction = {
    [T in ProductActionType]: {
        type: T;
        options: ProductActionOptions<T>;
    };
}[ProductActionType];

export function createProductAction<Type extends ProductActionType>(type: Type, options: ProductActionOptions<Type>): ProductAction {
    return {
        type,
        options
    } as ProductAction
}

export function isProductActionType(actionType: string): actionType is ProductActionType {
    return Object.values(ProductActionType).includes(actionType as ProductActionType)
}

export interface Product {
    id: UUID
    shopId: UUID
    name: string
    emoji: string
    description: string
    price: number
    action?: ProductAction
}

export type ProductOptions = Omit<Product, 'id' | 'shopId'>
export type ProductOptionsOptional = Partial<ProductOptions>

export interface Balance<Item> {
    item: Item
    amount: number
}

export interface Account {
    currencies: Map<UUID, Balance<Currency>>
    inventory: Map<UUID, Balance<Product>>
}

export interface ProductId {
    id: UUID
    shopId: UUID
}

export interface AccountsDatabaseJSONBody extends DatabaseJSONBody {
    [userId: Snowflake]: {
        currencies: {[currencyId: UUID]: Balance<UUID>},
        inventory: {[productId: UUID]: Balance<ProductId>}
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
            const currencies = Object.fromEntries(Array.from(account.currencies.entries()).map(([id, balance]) => [id, { item: balance.item.id, amount: balance.amount } as Balance<UUID>]))
            const inventory = Object.fromEntries(Array.from(account.inventory.entries()).map(([id, balance]) => [id, { item: { id: balance.item.id, shopId: balance.item.shopId }, amount: balance.amount } as Balance<ProductId>]))

            accountsJSON[userId] = { currencies, inventory }
        })

        return accountsJSON
    }

    protected parseRaw(databaseRaw: AccountsDatabaseJSONBody): Map<Snowflake, Account> {
        const accounts: Map<Snowflake, Account> = new Map()

        for (const [userId, { currencies: currenciesJSON, inventory: inventoryJSON }] of Object.entries(databaseRaw)) {
            const currenciesArray = Array.from(Object.entries(currenciesJSON)).filter(([id, _]) => getCurrencies().has(id)).map(([id, balance]) => [id, { item: getCurrencies().get(id), amount: balance.amount }] as [UUID, Balance<Currency>])
            const inventoryArray = Array.from(Object.entries(inventoryJSON)).filter(([id, balance]) => getShops().has(balance.item.shopId) && getProducts(balance.item.shopId).has(id)).map(([id, balance]) => [id, { item: getProducts(balance.item.shopId)!.get(id)!, amount: balance.amount }] as [UUID, Balance<Product>])

            accounts.set(userId, { currencies: new Map(currenciesArray), inventory: new Map(inventoryArray) })
        }

        return accounts
    }
}

export interface CurrenciesDatabaseJSONBody extends DatabaseJSONBody {
    [currencyId: UUID]: Currency
}


export class CurrenciesDatabase extends Database {
    public currencies: Map<UUID, Currency>

    public constructor (databaseRaw: CurrenciesDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.currencies = this.parseRaw(databaseRaw)
    }

    public toJSON(): CurrenciesDatabaseJSONBody {
        const currencies: CurrenciesDatabaseJSONBody = Object.fromEntries(this.currencies)
        return currencies
    }

    protected parseRaw(databaseRaw: CurrenciesDatabaseJSONBody): Map<UUID, Currency> {
        return new Map(Object.entries(databaseRaw))
    }
}

export interface Shop {
    id: UUID
    name: string
    emoji: string
    description: string
    currency: Currency
    discountCodes: {[code: string]: number}
    products: Map<UUID, Product>
}

export type ShopOptions = Omit<Shop, 'id' | 'products' | 'currency' | 'discountCodes'>
export type ShopOptionsOptional = Partial<ShopOptions>



export type ProductActionJSONBody = {
    [T in ProductActionType]: {
        type: string;
        options: ProductActionOptions<T>;
    };
}[ProductActionType];

export interface ShopsDatabaseJSONBody extends DatabaseJSONBody {
    [shopId: UUID]: Omit<Shop, 'products' | 'currency'> 
        & { 
            products: { [productId: UUID]: Omit<Product, 'action'> & { action?: ProductActionJSONBody } }
        } 
        & { currencyId: UUID }
}

export class ShopsDatabase extends Database {
    public shops: Map<UUID, Shop>

    public constructor (databaseRaw: ShopsDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.shops = this.parseRaw(databaseRaw)
    }

    public toJSON(): ShopsDatabaseJSONBody {
        const shopsJSON: ShopsDatabaseJSONBody = {}

        this.shops.forEach((shop, shopId) => {
            shopsJSON[shopId] = { ...shop, products: Object.fromEntries(shop.products), currencyId: shop.currency.id }
        })

        return shopsJSON
    }

    protected parseRaw(databaseRaw: ShopsDatabaseJSONBody): Map<UUID, Shop> {
        const shops: Map<UUID, Shop> = new Map()

        for (const [shopId, shop] of Object.entries(databaseRaw)) {
            if (!getCurrencies().has(shop.currencyId)) continue
            
            const products = new Map(
                Object.entries(shop.products).map(
                    ([id, product]) => {
                        let action: ProductAction | undefined = undefined

                        if (product.action && isProductActionType(product.action.type)) {
                            action = createProductAction(product.action.type, product.action.options)
                        }

                        return [id, { ...product, action}]
                })
            )

            shops.set(shopId, { ...shop, products, currency: getCurrencies().get(shop.currencyId)! })
        }

        return shops
    }
}

