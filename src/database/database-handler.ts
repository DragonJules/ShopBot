import fs from 'node:fs/promises'
import { Database } from "./database-types"


export const save = (database: Database) => new Promise<boolean>(async (resolve, _reject) => {
    try {
        await fs.writeFile(database.path, JSON.stringify(database.toJSON(), null, 4))

        resolve(true)
    } catch (error) {
        resolve(false)
    }
})  