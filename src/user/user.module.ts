import { Logger, Module } from '@nestjs/common'
import { WeSdkFactory } from '../common/we-sdk.provider'
import { ConfigService } from '../config/config.service'
import { UserService } from './user.service'
import { DatabaseModule } from '../database/database.module'
import { UserController } from './user.controller'


@Module({
  providers: [
    ConfigService,
    Logger,
    WeSdkFactory,
  ],
  imports: [DatabaseModule.forRoot()],
  controllers: [UserController],
  exports: [UserService]
})
export class BlockchainListenerModule {}
