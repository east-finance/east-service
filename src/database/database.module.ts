import { DynamicModule, Inject, Module, OnModuleDestroy } from '@nestjs/common'
import { DB_CON_TOKEN } from '../common/constants'
import { ConfigModule } from '../config/config.module'
import { ConfigService } from '../config/config.service'
import { pgProviders } from './pg.providers'
import { Knex } from 'knex'

@Module({
  imports: [ConfigModule],
  providers: [...pgProviders],
  exports: [...pgProviders],
})
export class DatabaseModule implements OnModuleDestroy {

  static forRoot (dbName?: string): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        ...pgProviders,
        {
          provide: ConfigService,
          useValue: new ConfigService(dbName),
        },
      ],
      exports: pgProviders,
    }
  }
  constructor (@Inject(DB_CON_TOKEN) private readonly dbConnection: Knex) {}

  onModuleDestroy (): void {
    this.dbConnection.destroy()
  }
}
