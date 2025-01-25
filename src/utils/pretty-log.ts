import fs from 'fs/promises'
import { DateTime } from 'luxon'
import path from 'path'

export class PrettyLog {
    private static loadStepCount = 1
    static logLoadStep(message: string, more?: string) {
        console.log(`${this.stepX()} \x1b[32m${message}\x1b[0m \x1b[34m${more != undefined ? more : ''}\x1b[0m`)

        this.saveLogs(`✓ Step ${this.loadStepCount - 1} - ${message} ${more != undefined ? more : ''}`)
    }
    
    static logLoadSucces() {
        console.log(`\n\x1b[7m ✓ \x1b[32m Loading finished after ${this.loadStepCount - 1} steps \x1b[0m\n`)
        
        this.saveLogs(`✓ Loading finished after ${this.loadStepCount - 1} steps`)

        this.loadStepCount = 1
    }

    static error(message: string, save = true) {
        console.log(`\x1b[7m ✕ \x1b[31m Error \x1b[0m \x1b[31m${message}\x1b[0m`)

        if (!save) return
        this.saveLogs(`✕ Error - ${message}`)
    }
    
    static warning(message: string, save = true) {
        console.log(`\x1b[7m ! \x1b[33m Warning \x1b[0m \x1b[33m${message}\x1b[0m`)

        if (!save) return
        this.saveLogs(`! Warning - ${message}`)
    }

    static info(message: string, save = true) {
        console.log(`\x1b[7m ? \x1b[34m Info \x1b[0m ${message}`)

        if (!save) return
        this.saveLogs(`? Info - ${message}`)
    }

    static succes(message: string, save = true) {
        console.log(`\x1b[7m ✓ \x1b[32m Success \x1b[0m \x1b[32m${message}\x1b[0m`)

        if (!save) return
        this.saveLogs(`✓ Succes - ${message}`)
    }
    
    static stepX(): string{
        this.loadStepCount ++
        return `\x1b[7m ✓ \x1b[32m Step ${this.loadStepCount - 1} \x1b[0m`
    }

    static bold(message: string): string {
        return `\x1b[1m${message}\x1b[0m`
    }

    static underline(message: string): string {
        return `\x1b[4m${message}\x1b[0m`
    }

    static italic(message: string): string {
        return `\x1b[3m${message}\x1b[0m`
    }


    private static async saveLogs(message: string) {
        try {
            const sanatizedMessage = message.replace(new RegExp('\x1b\\[\\d+m', 'gm'), '')
            await fs.appendFile(path.join(__dirname, '..', '..', 'logs.txt'), `[${this.getNowTimeString()}] ${sanatizedMessage}\n`)
        } catch (error) {
            console.log(`Failed to save logs: ${error}`)
        }
    }

    private static getNowTimeString(): string | null {
        return DateTime.now().setZone('Europe/Paris').toSQL({ includeOffset: false })
    }
}


