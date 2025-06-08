export type UUID = string

export enum DatabaseErrors {
    ShopDoesNotExist = 'Shop does not exist',
    ShopAlreadyExists = 'Shop already exists',
    InvalidPosition = 'Invalid position',

    CurrencyDoesNotExist = 'Currency does not exist',
    CurrencyAlreadyExists = 'Currency already exists',

    ProductDoesNotExist = 'Product does not exist',

    AccountDoesNotExist = 'Account does not exist',

    InvalidSettingType = "Provided setting type is invalid",
    DuplicateSettingName = "Provided setting name already exists"
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


