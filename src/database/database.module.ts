import { DynamicModule, Inject, Module, OnModuleDestroy } from '@nestjs/common'
import { Connection } from 'typeorm'
import { DB_CON_TOKEN } from '../common/constants'
import { ConfigModule } from '../config/config.module'
import { ConfigService } from '../config/config.service'
import { pgProviders } from './pg.providers'

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
  constructor (@Inject(DB_CON_TOKEN) private readonly dbConnection: Connection) {}

  onModuleDestroy (): void {
    this.dbConnection.close()
  }
}
