import { Snowflake } from "discord.js";
import { assertNeverReached } from "../../utils/utils";
import { Database, DatabaseError, DatabaseErrors } from "../database-types";

const settingTypes = ["string", "bool", "number", "channelId", "roleId", "userId"] as const

type SettingType = typeof settingTypes[number]

export type Setting = { id: string, name: string } & ({
    value: string | undefined
    type: "string"
} | {
    value: boolean | undefined
    type: "bool"
} | {
    value: number | undefined
    type: "number"
} | {
    value: Snowflake | undefined
    type: "channelId" | "roleId" | "userId"
}) 


export function isSetting(setting: unknown): setting is Setting {
    return typeof setting === "object" && setting !== null && "id" in setting && "name" in setting && "value" in setting && "type" in setting
}
    
function isSettingType(type: unknown): type is SettingType {
    return settingTypes.includes(type as SettingType)
}

export type Settings = Map<string, Setting>

type SettingsJSONBody = {
    [name: string]: Omit<Setting, "type" | "value"> & { type: string, value: string | boolean | number | null }
}

export class SettingsDatabase extends Database {
    public settings: Settings = new Map()

    public constructor (databaseRaw: SettingsJSONBody, path: string) {
        super(databaseRaw, path)
        this.settings = this.parseRaw(databaseRaw)
    }
    
    public override toJSON(): SettingsJSONBody {
        const settingsJSON: SettingsJSONBody = {}

        this.settings.forEach((setting) => {
            settingsJSON[setting.id] = { ...setting, type: setting.type as string, 
                value: (setting.value === undefined) ? null : setting.value
            }
        })

        return settingsJSON
    }

    protected override parseRaw(databaseRaw: SettingsJSONBody): Settings {
        const settings: Settings = new Map()

        for (const [id, setting] of Object.entries(databaseRaw)) {
            if (!(isSettingType(setting.type))) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
            
            const name = setting.name
            const value = setting.value

            if(settings.has(id)) throw new DatabaseError(DatabaseErrors.DuplicateSettingName)

            if (value === null) {
                settings.set(id, { id, name, value: undefined, type: setting.type })
                continue
            }

            switch (setting.type) {
                case "channelId":
                case "roleId":
                case "userId":
                    if (!(typeof value === "string")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    settings.set(id, { id, name, value: value as Snowflake, type: setting.type })
                    break

                case "string":
                    if (!(typeof value === "string")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    settings.set(id, { id, name, value: value as string, type: setting.type })
                    break
                case "bool":
                    if (!(typeof value === "boolean")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    settings.set(id, { id, name, value: value as boolean, type: setting.type })
                    break

                case "number":
                    if (!(typeof value === "number")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    settings.set(id, { id, name, value: value as number, type: setting.type })
                    break

                default:
                    assertNeverReached(setting.type)
            }
        
        }

        return settings
    }
}
