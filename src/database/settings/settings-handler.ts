import { save } from "../database-handler"
import { Setting, Settings, SettingsDatabase } from "./settings-types"

import settings from '../../../data/settings.json'

const settingsDatabase = new SettingsDatabase(settings, "data/settings.json")

export function getSettings(): Settings {
    return settingsDatabase.settings
}

export async function setSetting(id: string, value: any): Promise<Setting> {
    if (!settingsDatabase.settings.has(id)) throw new Error("Setting does not exist")
    const setting = settingsDatabase.settings.get(id)!

    settingsDatabase.settings.set(id, {...setting, value: value})

    await save(settingsDatabase)

    return settingsDatabase.settings.get(id)!
}