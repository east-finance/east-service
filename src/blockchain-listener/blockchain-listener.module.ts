import { Logger, Module } from '@nestjs/common'
import { WeSdkFactory } from '../common/we-sdk.provider'
import { ConfigService } from '../config/config.service'
import { BlockchainListenerService } from './blockchain-listener.service'
import { PersistService } from './persist.service'
import { VaultService } from './vault.service'
import { TransactionService } from './transactions.service'
import { DatabaseModule } from '../database/database.module'
import { UserModule } from '../user/user.module'
import { UserService } from '../user/user.service'


@Module({
  providers: [
    ConfigService,
    Logger,
    WeSdkFactory,
    BlockchainListenerService,
    PersistService,
    VaultService,
    TransactionService,
    UserService
  ],
  imports: [
    DatabaseModule.forRoot(),
    UserModule
  ],
  exports: [BlockchainListenerService]
})
export class BlockchainListenerModule {}
