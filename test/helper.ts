import {Client} from 'pg'
import {ConfigService} from '../src/config/config.service'

function actWithDb(action: 'create' | 'drop', dbName: string) {
    return new Promise((resolve, reject) => {
        const cfg = new ConfigService('postgres')
        const pgOptions = cfg.getPgOptions()
        const client = new Client({
            ...pgOptions,
            user: pgOptions.username,
        })
        // disconnect client when all queries are finished
        client.on('drain', client.end.bind(client))
        client.on('error', reject)
        client.connect()
        const escapedDbName = dbName.replace(/\"/g, '""')
        const sql = `${action} DATABASE ${action === 'drop' ? 'if exists' : ''} "${escapedDbName}"`

        client.query(sql, (err: any, res: any) => {
            if (err) {
                return reject(err)
            }

            return resolve(res)
        })
    })
}

export async function createDb(name: string) {
    await dropDb(name)
    await actWithDb('create', name).catch((err) => {
        console.error(err)
        process.exit(1)
    })
}

export async function dropDb(name: string) {
    await actWithDb('drop', name).catch((err) => {
        console.error(err)
        process.exit(1)
    })
}