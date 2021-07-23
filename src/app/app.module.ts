import { HttpModule, Module } from '@nestjs/common'
import { ConfigModule } from '../config/config.module'
import { BlockchainListenerModule } from '../blockchain-listener/blockchain-listener.module'
import { UserModule } from '../user/user.module'
import { AppController } from './app.controller'
import { ContracExecutiontStatusModule } from '../contract-execution-status/contract-execution-status.module'

@Module({
  imports: [HttpModule, ConfigModule, BlockchainListenerModule, UserModule, ContracExecutiontStatusModule],
  controllers: [AppController]
})
export class ApplicationModule {}
