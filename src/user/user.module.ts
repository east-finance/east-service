import { Logger, Module } from '@nestjs/common'
import { WeSdkFactory } from '../common/we-sdk.provider'
import { ConfigService } from '../config/config.service'
import { ConfigModule } from '../config/config.module'
import { UserService } from './user.service'
import { DatabaseModule } from '../database/database.module'
import { UserController } from './user.controller'
import { jwtFactory } from '../common/jwt.factory'
import { JwtStrategy } from '../common/jwt.strategy'
import { JwtModule } from '@nestjs/jwt'
import { LiquidationService } from '../blockchain-listener/liquidation.service'
import { PersistService } from '../blockchain-listener/persist.service'

@Module({
  providers: [
    ConfigService,
    Logger,
    WeSdkFactory,
    UserService,
    JwtStrategy,
    PersistService,
    LiquidationService
  ],
  imports: [
    DatabaseModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ ConfigModule ],
      useFactory: jwtFactory,
      inject: [ConfigService],
    })
  ],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
