import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express'
import * as express from 'express'
import { ApplicationModule } from './app/app.module'
import { BlockchainListenerService } from './blockchain-listener/blockchain-listener.service'
import { ConfigService } from './config/config.service'
import { setupSwagger } from './swagger'

async function bootstrap () {
  const server = express()
  server.disable('x-powered-by')

  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    new ExpressAdapter(server),
    {
      cors: { origin: ['*'], credentials: true },
    },
  )
  const configService = app.get(ConfigService)

  const logger = app.get(Logger)
  logger.log(configService.envs)
  logger.log(
    `Starting with parameters: ${JSON.stringify(configService.getVersionInfo(), null, 2)}`,
    'APP',
  )
  logger.log(
    `AuthService public key:\n${configService.publicKey}`,
    'APP',
  )

  setupSwagger(
    app,
    configService.envs.SWAGGER_BASE_PATH,
    configService.isDev(),
    configService.getVersionInfo()
  )

  const blockchainListenerService = app.get(BlockchainListenerService)
  await blockchainListenerService.start()
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
