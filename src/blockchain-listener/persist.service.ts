import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { NodeBlock } from '@wavesenterprise/grpc-listener'
import { DB_CON_TOKEN, Tables } from '../common/constants'
import { ParsedIncomingFullGrpcTxType } from '@wavesenterprise/js-sdk'

import { Knex } from 'knex'

@Injectable()
export class PersistService {

  constructor (
    private readonly configService: ConfigService,
    @Inject(DB_CON_TOKEN) readonly knex: Knex
  ) {}


  async getTransactionByRequestId(id: string, sqlTx?: any) {
    const transaction = await (sqlTx || this.knex)(Tables.TransactionsLog)
      .select('*')
      .where('request_tx_id', id)
    if (transaction && transaction.length) {
      return transaction[0]
    }
  }


  async getLastOracles(sqlTx?: any) {
    const [ westRate ] = await (sqlTx || this.knex)(Tables.Oracles)
      .select('*')
      .where('stream_id', this.configService.envs.WEST_ORACLE_STREAM)
      .orderBy('timestamp', 'desc')
      .limit(1)

    const [ rwaRate ] = await (sqlTx || this.knex)(Tables.Oracles)
      .select('*')
      .where('stream_id', this.configService.envs.RWA_ORACLE_STREAM)
      .orderBy('timestamp', 'desc')
      .limit(1)

    return { westRate, rwaRate }
  }

  async saveBlock(tx: Knex.Transaction<any, any[]>, block: NodeBlock) {
    await tx(Tables.Blocks).insert({
      height: block.height,
      timestamp: new Date(block.timestamp),
      generator: block.generator,
      signature: block.signature
    })
  }

  async saveOracle(tx: any, incomingTx: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    for (const result of incomingTx.resultsList || []) {
      if (result.key !== this.configService.envs.RWA_ORACLE_STREAM
        && result.key !== this.configService.envs.WEST_ORACLE_STREAM) {
        continue
      }
      let parsedOracles = null
      try {
        parsedOracles = JSON.parse(result.value)
        if (!(parsedOracles && parsedOracles.value && parsedOracles.timestamp)) {
          parsedOracles = null
          throw new Error('Wrong oracles format')
        }
      } catch (e) {
        Logger.error(`Error: cannot parse incoming Oracle value: ${result.value}: ${e.message}`)
      }

      if (parsedOracles) {
        const { value, timestamp } = parsedOracles
        await tx(Tables.Oracles).insert({
          tx_id: incomingTx.id,
          height: block.height,
          tx_timestamp: new Date(incomingTx.tx.callContractTransaction.timestamp as any),
          executed_timestamp: new Date(incomingTx.timestamp as any),
          timestamp: new Date(parseInt(timestamp)),
          value,
          stream_id: result.key
        })
      }
    }
  }

  getLastBlocksSignature = async () => {
    const [ lastBlock ] = await this.knex(Tables.Blocks).select('*').orderBy('height', 'DESC').limit(1)
    if (lastBlock) {
      return lastBlock.signature
    } else if (this.configService.envs.FIRST_BLOCK_SIGNATURE) {
      return this.configService.envs.FIRST_BLOCK_SIGNATURE
    }
    return null as any
  }

  rollbackLastBlock = async () => {
    await this.knex(Tables.Blocks)
      .delete()
      .where('height', 'in',
        this.knex(Tables.Blocks)
          .select('height')
          .orderBy('height', 'DESC')
          .limit(1)
      )
  }

  rollbackToBlockSignature = async (signature: string) => {
    const [ block ] = await this.knex(Tables.Blocks)
      .select('*')
      .where({signature})
      .limit(1)

    if (!block) {
      throw new Error(`no block with signature: ${block}`)
    }

    await this.knex(Tables.Blocks)
      .delete()
      .where('height', '>=', block.height)
  }
}
