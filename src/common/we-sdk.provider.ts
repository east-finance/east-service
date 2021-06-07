import { create, MAINNET_CONFIG } from '@wavesenterprise/js-sdk'
import { ConfigService } from '../config/config.service'
import { WE_SDK_PROVIDER_TOKEN } from './constants'
import { GrpcListener } from '@wavesenterprise/grpc-listener'
import { Logger } from '@nestjs/common'


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
      auth: { nodeApiKey: configService.envs.NODE_API_KEY }
    }

    const listener = new GrpcListener(config)
    const wavesConfig = await listener.getNodeConfig()

    const minimumFee = wavesConfig.minimumFeeMap.reduce((res: any, curr: any) => {
      res[parseInt(curr[0])] = parseFloat(curr[1])
      return res
    }, {})

    listener.cancel()
    return create({
      initialConfiguration: {
        ...MAINNET_CONFIG,
        nodeAddress: configService.envs.NODE_ADDRESS,
        crypto: wavesConfig.cryptoType === 1 ? 'gost' : 'waves',
        networkByte: wavesConfig.chainId,
        minimumFee,
        grpcAddress: configService.getGrpcAddresses()[0]
      },
    })
  },
  inject: [ConfigService],
}
