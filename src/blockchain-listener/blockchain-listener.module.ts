import { Logger, Module } from '@nestjs/common'
import { WeSdkFactory } from '../common/we-sdk.provider'
import { ConfigService } from '../config/config.service'
import { BlockchainListenerService } from './blockchain-listener.service'


@Module({
  providers: [
    ConfigService,
    Logger,
    WeSdkFactory,
    BlockchainListenerService,
  ],
  exports: [BlockchainListenerService]
})
export class BlockchainListenerModule {}
