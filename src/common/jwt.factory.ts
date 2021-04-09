import { Algorithm } from 'jsonwebtoken'
import { ConfigService } from '../config/config.service'

export async function jwtFactory (configService: ConfigService) {
  return {
    ...(await configService.getJwtOptions()),
    verifyOptions: {
      algorithms: ['RS256'] as Algorithm[],
    },
  }
}
