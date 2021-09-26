import { create, MAINNET_CONFIG, IWeSdkCtr } from '@wavesenterprise/js-sdk'
import { ConfigService } from '../config/config.service'
import { WE_SDK_PROVIDER_TOKEN } from './constants'
import { GrpcListener } from '@wavesenterprise/grpc-listener'
import { Logger } from '@nestjs/common'
import { ApiTokenRefresher } from '@wavesenterprise/api-token-refresher'
import axios from 'axios'
import { getOAuthTokens } from './oauth';

export const WeSdkFactory = {
  provide: WE_SDK_PROVIDER_TOKEN,
  useFactory: async (configService: ConfigService) => {
    const nodeGRPCAddress = configService.getGrpcAddresses()

    const config = {
      addresses: nodeGRPCAddress,
      logger: {
        info: Logger.log.bind(Logger),
        error: Logger.error.bind(Logger),
        warn: Logger.warn.bind(Logger)
      },
      auth: configService.getAuthOptions()
    }

    const listener = new GrpcListener(config)
    const wavesConfig = await listener.getNodeConfig()

    const minimumFee = wavesConfig.minimumFeeMap.reduce((res: any, curr: any) => {
      res[parseInt(curr[0])] = parseFloat(curr[1])
      return res
    }, {})

    listener.cancel()

    const jsSDKConfig: IWeSdkCtr = {
      initialConfiguration: {
        ...MAINNET_CONFIG,
        nodeAddress: configService.envs.NODE_ADDRESS,
        crypto: wavesConfig.cryptoType === 1 ? 'gost' : 'waves',
        networkByte: wavesConfig.chainId,
        minimumFee,
        grpcAddress: configService.getGrpcAddresses()[0]
      }
    }

    if (configService.envs.SERVICE_TOKEN) {
      const refreshCallback = async (token: string) => {
        try {
          const { data } = await axios.post(`${configService.envs.AUTH_URL}/v1/auth/refresh`, { token })
          Logger.log('Auth tokens successfully refreshed')
          return data
        } catch (e) {
          Logger.log('Refresh failed, relogin with service token')
          return getOAuthTokens(configService.envs.AUTH_URL, configService.envs.SERVICE_TOKEN as string)
        }
      }

      try {
        const tokens = await getOAuthTokens(configService.envs.AUTH_URL, configService.envs.SERVICE_TOKEN)
        const apiTokenRefresher = new ApiTokenRefresher({
          authorization: tokens,
          refreshCallback,
        })
        const { fetch: fetchInstance } = apiTokenRefresher.init()
        jsSDKConfig.fetchInstance = fetchInstance
      } catch (e) {
        Logger.error(`Cannot create WE JsSDK instance: '${e.message}', exit`)
        process.exit(1)
      }
    }

    return create(jsSDKConfig)
  },
  inject: [ConfigService],
}
