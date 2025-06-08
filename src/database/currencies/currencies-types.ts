import { Database, DatabaseJSONBody, UUID } from "../database-types"

export interface Currency {
    id: UUID
    name: string
    emoji: string
}

export type CurrencyOptions = Omit<Currency, 'id'>
export type CurrencyOptionsOptional = Partial<CurrencyOptions>

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
