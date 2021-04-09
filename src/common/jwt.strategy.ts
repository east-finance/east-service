import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '../config/config.service'

export interface IUser {
  id: string
  name: string
  roles: string[]
  createdAt: Date
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor (configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.publicKey,
    })
  }

  async validate (user: IUser) {
    return user
  }
}
