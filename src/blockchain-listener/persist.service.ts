import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { NodeBlock } from '@wavesenterprise/grpc-listener'
import { DB_CON_TOKEN } from '../common/constants'
import { ParsedIncomingFullGrpcTxType } from '@wavesenterprise/js-sdk'

import { Knex } from 'knex'

@Injectable()
export class PersistService {

  constructor (
    private readonly configService: ConfigService,
    @Inject(DB_CON_TOKEN) readonly knex: Knex
  ) {}


  async getTransactionByReuestId(id: string, sqlTx?: any) {
    const transaction = await (sqlTx || this.knex)('transactions')
      .select('*')
      .where('request_tx_id', id)
    if (transaction && transaction.length) {
      return transaction[0]
    }
  }


  async getLastOracles(sqlTx: any, blockTimestamp: number) {
    const [ west ] = await (sqlTx || this.knex)('oracles')
      .select('*')
      .where('stream_id', this.configService.envs.WEST_ORACLE_STREAM)
      .andWhere('timestamp', '<=', new Date(blockTimestamp))
      .orderBy('timestamp', 'desc')
      .limit(1)

    const [ usdp ] = await (sqlTx || this.knex)('oracles')
      .select('*')
      .where('stream_id', this.configService.envs.USDP_ORACLE_STREAM)
      .andWhere('timestamp', '<=', new Date(blockTimestamp))
      .orderBy('timestamp', 'desc')
      .limit(1)

    return { west, usdp }
  }

  async saveBlock(tx: any, block: NodeBlock) {
    await tx('blocks').insert({
      height: block.height,
      timestamp: new Date(block.timestamp),
      generator: block.generator,
      signature: block.signature
    })
  }

  async saveOracle(tx: any, incomingTx: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    const [ result ] = incomingTx.resultsList as any[]
    if (result.key !== this.configService.envs.USDP_ORACLE_STREAM
      && result.key !== this.configService.envs.WEST_ORACLE_STREAM) {
      return
    }
    const { value, timestamp } = JSON.parse(result.value)
    await tx('oracles').insert({
      tx_id: incomingTx.id,
      height: block.height,
      tx_timestamp: new Date(incomingTx.tx.callContractTransaction.timestamp as any),
      executed_timestamp: new Date(incomingTx.timestamp as any),
      timestamp: new Date(parseInt(timestamp)),
      value,
      stream_id: result.key
    })
  }

  getLastBlocksSignature = async () => {
    const [ lastBlock ] = await this.knex('blocks').select('*').orderBy('height', 'DESC').limit(1)
    if (lastBlock) {
      return lastBlock.signature
    } else if (this.configService.envs.FIRST_BLOCK_SIGNATURE) {
      return this.configService.envs.FIRST_BLOCK_SIGNATURE
    }
    return null as any
  }

  rollbackLastBlock = async () => {
    await this.knex('blocks')
      .delete()
      .where('height', 'in', 
        this.knex('blocks')
          .select('height')
          .orderBy('height', 'DESC')
          .limit(1)
      )
  }

  rollbackToBlockSignature = async (signature: string) => {
    const [ block ] = await this.knex('blocks')
      .select('*')
      .where({signature})
      .limit(1)

    if (!block) {
      throw new Error(`no block with signature: ${block}`)
    }

    await this.knex('blocks')
      .delete()
      .where('height', '>=', block.height)
  }
}
