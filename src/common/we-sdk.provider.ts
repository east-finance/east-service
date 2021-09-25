import { create, MAINNET_CONFIG } from '@wavesenterprise/js-sdk'
import { ConfigService } from '../config/config.service'
import { WE_SDK_PROVIDER_TOKEN } from './constants'
import { GrpcListener } from '@wavesenterprise/grpc-listener'
import { Logger } from '@nestjs/common'
import { ApiTokenRefresher } from '@wavesenterprise/api-token-refresher'
import axios from 'axios'

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

    const getTokens = async () => {
      const { data } = await axios.post(`${configService.envs.AUTH_URL}/v1/auth/token`, { },
        {
          headers: {
            Authorization: `bearer ${configService.envs.SERVICE_TOKEN}`
          }
        })
      return data
    }

    const refreshCallback = async (token: string) => {
      try {
        const { data } = await axios.post(`${configService.envs.AUTH_URL}/v1/auth/refresh`, { token })
        console.log('Auth tokens successfully refreshed')
        return data
      } catch (e) {
        console.log('Refresh failed, relogin with service token')
        return getTokens()
      }
    }

    const tokens = await getTokens()

    const apiTokenRefresher = new ApiTokenRefresher({
      authorization: tokens,
      refreshCallback,
    })
    const { fetch: fetchInstance } = apiTokenRefresher.init()

    return create({
      initialConfiguration: {
        ...MAINNET_CONFIG,
        nodeAddress: configService.envs.NODE_ADDRESS,
        crypto: wavesConfig.cryptoType === 1 ? 'gost' : 'waves',
        networkByte: wavesConfig.chainId,
        minimumFee,
        grpcAddress: configService.getGrpcAddresses()[0]
      },
      fetchInstance
    })
  },
  inject: [ConfigService],
}
