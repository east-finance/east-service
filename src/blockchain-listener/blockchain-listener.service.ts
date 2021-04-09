import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { ParsedIncomingGrpcTxType } from '@wavesenterprise/js-sdk'
import { GrpcListener, ConfigRpc, NodeBlock } from '@wavesenterprise/grpc-listener'
import * as grpc from 'grpc'

@Injectable()
export class BlockchainListenerService {
  nodeAddress: string[]
  config: ConfigRpc
  listener: GrpcListener
  call: grpc.ClientReadableStream<any>


  constructor (
    private readonly configService: ConfigService,
  ) {
    const nodeAddress = this.configService.getGrpcAddresses()
    this.config = {
      addresses: nodeAddress,
      logger: {
        info: Logger.log,
        error: Logger.error,
        warn: Logger.warn
      },
      auth: {nodeApiKey: configService.envs.NODE_API_KEY},
      asyncGrpc: false,
      getLastBlocksSignature: this.getLastBlocksSignature
    }
  }

  async start() {
    this.listener = new GrpcListener(this.config)
    await this.listener.listen(
      this.rollbackLastBlock,
      this.rollbackToBlockSignature,
      this.receiveTxs,
      this.receiveNewGrpcCall,
      this.receiveError
    )
  }

  receiveTxs = async (block: NodeBlock, txs: ParsedIncomingGrpcTxType[]) => {
    // take your txs here
  }

  receiveNewGrpcCall = (call: grpc.ClientReadableStream<any>) => {
    // take if you need
    this.call = call
  }

  getLastBlocksSignature = async () => {
    // TODO
    return Promise.resolve('test')
  }

  rollbackLastBlock = async () => {
    // TODO
    return Promise.resolve()
  }

  rollbackToBlockSignature = async (signature: string) => {
    // TODO
    return Promise.resolve()
  }

  receiveError = async (err: Error) => {
    console.trace(err)
    process.exit(1)
  }
}
