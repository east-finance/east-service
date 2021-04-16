import { Logger } from '@nestjs/common'
import { DB_CON_TOKEN } from '../common/constants'
import { ConfigService } from '../config/config.service'
import { resolve as pathResolve } from 'path'
import knex from 'knex'

const pool = {
  min: 2,
  max: 10,
}

const migrations = {
  tableName: 'migrations',
  directory: pathResolve(__dirname, '..', 'migrations'),
}

const logger = new Logger('Knex provider');

export const pgProviders = [
  {
    provide: DB_CON_TOKEN,
    useFactory: async (configService: ConfigService) => {
      const client = knex({
        client: 'pg',
        connection: configService.getPgOptions(),
        pool,
        migrations,
      })
      
      const [, migrationList] = await client.migrate.list()
      if (migrationList.length > 0) {
        logger.log(`Starting PG migrations: ${migrationList.map((item: any) => item.file).join(', ')}`)
      }
 
      const [, migrationList2] = await client.migrate.latest()
      if (migrationList2.length > 0) {
        logger.log(`Migrated: ${migrationList2.join(', ')}`);
      }

      return client
    },
    inject: [ConfigService],
  },
]
