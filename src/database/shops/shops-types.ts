import { Snowflake } from "discord.js";
import { getCurrencies } from "../currencies/currencies-database";
import { Currency } from "../currencies/currencies-types";
import { UUID, DatabaseJSONBody, Database } from "../database-types";

export const PRODUCT_ACTION_TYPE = {
    GiveRole: 'give-role',
    GiveCurrency: 'give-currency'
} as const

export type ProductActionType = typeof PRODUCT_ACTION_TYPE[keyof typeof PRODUCT_ACTION_TYPE]

export type ProductActionOptions<Type extends ProductActionType> = 
    Type extends typeof PRODUCT_ACTION_TYPE.GiveRole ? { roleId: Snowflake } :
    Type extends typeof PRODUCT_ACTION_TYPE.GiveCurrency ? { currencyId: UUID, amount: number } :
    never;

export type ProductAction = {
    [T in ProductActionType]: {
        type: T;
        options: ProductActionOptions<T>;
    };
}[ProductActionType];

export type ProductActionJSONBody = {
    [T in ProductActionType]: {
        type: string;
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
    return Object.values(PRODUCT_ACTION_TYPE).includes(actionType as ProductActionType);
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


export interface Shop {
    id: UUID
    name: string
    emoji: string
    description: string
    currency: Currency
    discountCodes: {[code: string]: number}
    reservedTo?: Snowflake
    products: Map<UUID, Product>
}

export type ShopOptions = Omit<Shop, 'id' | 'products' | 'currency' | 'discountCodes'>
export type ShopOptionsOptional = Partial<ShopOptions>


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

