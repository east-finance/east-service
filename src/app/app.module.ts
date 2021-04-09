import { HttpModule, Module } from '@nestjs/common'
import { ConfigModule } from '../config/config.module'
import { BlockchainListenerModule } from '../blockchain-listener/blockchain-listener.module'
import { AppController } from './app.controller'

@Module({
  imports: [HttpModule, ConfigModule, BlockchainListenerModule],
  controllers: [AppController]
})
export class ApplicationModule {}
