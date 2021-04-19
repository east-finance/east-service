import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { DB_CON_TOKEN, WE_SDK_PROVIDER_TOKEN } from '../common/constants'
import { ParsedIncomingFullGrpcTxType, WeSdk } from '@wavesenterprise/js-sdk'
import { NodeBlock } from '@wavesenterprise/grpc-listener'
import { Knex } from 'knex'
import { PersistService } from './persist.service'

const WEST_DECIMALS = 8

@Injectable()
export class TransactionService {
  maxDiff: number
  usdpPartInPosition: number

  constructor (
    private readonly configService: ConfigService,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk & {minimumFee: any},
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
    private readonly persistService: PersistService
  ) {
    this.maxDiff = this.configService.envs.EXPIRED_ORACLE_DATA
    const { EAST_USDP_PART, EAST_WEST_COLLATERAL } = this.configService.envs
    this.usdpPartInPosition = EAST_USDP_PART / ((1 - EAST_USDP_PART) * EAST_WEST_COLLATERAL + EAST_USDP_PART)
  }

  async receiveCallEastContract(sqlTx: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    if (call.tx.callContractTransaction && call.tx.callContractTransaction.senderPublicKey === this.configService.envs.NODE_PUBLIC_KEY) {
      const mintParam = call.tx.callContractTransaction.paramsList?.find(param => param.key === 'mint')
      const mintVal = JSON.parse(mintParam.value)
      if (mintParam) {
        await sqlTx('executed_transactions').insert({
          tx_id: call.tx.callContractTransaction.id,
          address: mintVal.address,
          executed_tx_id: call.id,
          height: block.height,
          timestamp: new Date(),
          call_timestamp: new Date(call.tx.callContractTransaction.timestamp as any),
          executed_timestamp: new Date(call.timestamp as any),
        })
      }
    }
  }

  async issueTockens(sqlTx: any, transfer: ParsedIncomingFullGrpcTxType['transferTransaction'], block: NodeBlock) {
    const { west, usdp } = await this.persistService.getLastOracles(sqlTx, block.timestamp)
    
    const oldTx = await this.persistService.getTransactionByReuestId(transfer.id, sqlTx)
    if (oldTx) {
      Logger.error(`Tx already exists for request: ${transfer.id}`)
      if (!this.configService.envs.IS_DEV_ENVIRONMENT) {
        process.exit(1)
      }
    }

    // CHECK LAST VALUE TIMESTAMP
    // TODO ask about const now = Date.now()
    const now = block.timestamp
    if ((now - (new Date(west.timestamp)).getTime() > this.maxDiff)
      || (now - (new Date(usdp.timestamp)).getTime() > this.maxDiff)) {
      Logger.error(`Too big difference in milliseconds between oracle_data.timestamp and current timestamp: 
        west: ${now - (new Date(west.timestamp)).getTime()}, usdp: ${now - (new Date(usdp.timestamp)).getTime()}, max diff: ${this.maxDiff}`)
      Logger.error(`west: ${JSON.stringify(west)}`)
      Logger.error(`usdp: ${JSON.stringify(usdp)}`)
      process.exit(1)
    }

    // calculate amount
    const transferAmount = parseFloat(transfer.amount + '') / Math.pow(10, WEST_DECIMALS)
    const westToUsdpAmount = this.usdpPartInPosition * transferAmount
    const eastAmount = (westToUsdpAmount / west.value) / this.configService.envs.EAST_USDP_PART
    const usdpAmount = westToUsdpAmount / west.value * usdp.value
    const address = this.weSdk.tools.getAddressFromPublicKey(transfer.senderPublicKey)
    const info = {
      west_collateral: this.configService.envs.EAST_WEST_COLLATERAL,
      west_usd_rate: west.value,
      west_usd_tx: west.id,
      usdp_usd_rate: usdp.value,
      usdp_usd_tx: usdp.id,
      usdp_amount: usdpAmount,
      transfer_tx: transfer.id,
      transfer_amount: transferAmount,
    }

    const callBody = {
      contractId: this.configService.envs.EAST_CONTRACT_ID,
      contractVersion: 1,
      timestamp: Date.now(),
      params: [
        {
          type: 'string',
          key: 'mint',
          value: JSON.stringify({
            address,
            amount: eastAmount
          })
        },
        {
          type: 'string',
          key: 'transaction_info',
          value: JSON.stringify(info)
        }
      ]
    }

    const dockerCall = this.weSdk.API.Transactions.CallContract.V4(callBody)
    await dockerCall.broadcastGrpc({
      privateKey: this.configService.envs.NODE_PRIVATE_KEY,
      publicKey: this.configService.envs.NODE_PUBLIC_KEY,
    })

    await sqlTx('transactions').insert({
      tx_id: await dockerCall.getId(),
      height: block.height,
      request_tx_id: transfer.id,
      request_timestamp: new Date(transfer.timestamp as any),
      timestamp: new Date(),
      transaction_type: 'issue',
      amount: eastAmount,
      address,
      info,
    })
  }
}
