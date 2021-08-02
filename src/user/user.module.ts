import { Logger, Module, CacheModule } from '@nestjs/common'
import { WeSdkFactory } from '../common/we-sdk.provider'
import { ConfigService } from '../config/config.service'
import { ConfigModule } from '../config/config.module'
import { UserService } from './user.service'
import { DatabaseModule } from '../database/database.module'
import { UserController } from './user.controller'
import { jwtFactory } from '../common/jwt.factory'
import { JwtStrategy } from '../common/jwt.strategy'
import { JwtModule } from '@nestjs/jwt'

@Module({
  providers: [
    ConfigService,
    Logger,
    WeSdkFactory,
    UserService,
    JwtStrategy,
  ],
  imports: [
    DatabaseModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ ConfigModule ],
      useFactory: jwtFactory,
      inject: [ConfigService],
    }),
    CacheModule.register({
      ttl: 60,
      max: 10
    })
  ],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
