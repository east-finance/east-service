import { join } from 'path'
import { createConnection } from 'typeorm'
// import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { DB_CON_TOKEN } from '../common/constants'
import { ConfigService } from '../config/config.service'

export const pgProviders = [
  {
    provide: DB_CON_TOKEN,
    useFactory: async (configService: ConfigService) => {
      const connection = await createConnection({
        type: 'postgres',
        ...configService.getPgOptions(),
        // namingStrategy: new SnakeNamingStrategy(),
        entities: [join(__dirname, '..', '/**/*.entity{.ts,.js}')],
        migrations: [join(__dirname, '..', 'migrations/*{.ts,.js}')],
        migrationsRun: true,
      })
      return connection
    },
    inject: [ConfigService],
  },
]
