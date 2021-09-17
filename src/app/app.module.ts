import { HttpModule, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { ConfigModule } from '../config/config.module'
import { BlockchainListenerModule } from '../blockchain-listener/blockchain-listener.module'
import { UserModule } from '../user/user.module'
import { AppController } from './app.controller'
import { ContracExecutiontStatusModule } from '../contract-execution-status/contract-execution-status.module'
import { ConfigService } from '../config/config.service'
import { AppCacheModule } from '../cache/cache.module'
import { CustomThrottlerGuard } from '../common/throttler-guard'

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    BlockchainListenerModule,
    UserModule,
    ContracExecutiontStatusModule,
    AppCacheModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.getThrottleParams(),
    }),
  ],
  controllers: [AppController],
  providers: [
    ConfigService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
  exports: [AppCacheModule]
})
export class ApplicationModule {}
