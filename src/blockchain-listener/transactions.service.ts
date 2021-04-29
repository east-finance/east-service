import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { DB_CON_TOKEN, WE_SDK_PROVIDER_TOKEN, TxTypes, Operations, TxStatuses, StateKeys, Tables } from '../common/constants'
import { ParsedIncomingFullGrpcTxType, WeSdk } from '@wavesenterprise/js-sdk'
import { NodeBlock } from '@wavesenterprise/grpc-listener'
import { Knex } from 'knex'
import { PersistService } from './persist.service'
import { VaultService } from './vault.service'

const WEST_DECIMALS = 8

@Injectable()
export class TransactionService {
  maxDiff: number
  usdpPartInPosition: number

  constructor (
    private readonly configService: ConfigService,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk & {minimumFee: any},
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
    private readonly persistService: PersistService,
    private readonly vaultService: VaultService
  ) {
    this.maxDiff = this.configService.envs.EXPIRED_ORACLE_DATA
    const { EAST_USDP_PART, EAST_WEST_COLLATERAL } = this.configService.envs
    this.usdpPartInPosition = EAST_USDP_PART / ((1 - EAST_USDP_PART) * EAST_WEST_COLLATERAL + EAST_USDP_PART)
  }

  async receiveCallEastContract(sqlTx: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    if (call.tx.callContractTransaction && call.tx.callContractTransaction.senderPublicKey === this.configService.envs.EAST_SERVICE_PUBLIC_KEY) {
      const firstParam = call.tx.callContractTransaction.paramsList && call.tx.callContractTransaction.paramsList[0]
      if (!firstParam) {
        return
      }
      const parsed = JSON.parse(firstParam.value)
      switch (firstParam.key) {

        case Operations.mint:
          // save tx
          const [id] = await sqlTx(Tables.TransactionsLog).insert({
            tx_id: call.tx.callContractTransaction.id,
            status: TxStatuses.Executed,
            type: TxTypes.Issue,
            height: block.height,
            executed_tx_id: call.id,
            tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
            created_at: new Date(),
            address: parsed.address,
          }).returning('id')

          // save vault
          const vaultInfo = call.resultsList?.find(res => res.key === `${StateKeys.vault}_${call.tx.callContractTransaction.id}`)
          const vaultParsed = JSON.parse(vaultInfo.value)
          const paramInfo = (call.tx.callContractTransaction.paramsList as any[])[1]
          const paramInfoParsed = JSON.parse(paramInfo.value)
          await this.vaultService.createVault({
            txId: id,
            vaultId: call.tx.callContractTransaction.id,
            createdAt: new Date(call.timestamp as string),
            vault: vaultParsed,
            westRate: paramInfoParsed.west_usd_rate,
            sqlTx
          })
          
          // save balance
          const balanceInfo = call.resultsList?.find(res => res.key === `${StateKeys.balance}_${parsed.address}`)
          const balanceParsed = JSON.parse(balanceInfo.value)
          await sqlTx(Tables.BalanceLog).insert({
            id,
            address: parsed.address,
            east_amount: balanceParsed
          })
          break
        default:
          Logger.warn(`Unknown east contract params: ${firstParam}`)
          break
      }
    }
  }

  async issueTockens(sqlTx: any, transfer: ParsedIncomingFullGrpcTxType['transferTransaction'], block: NodeBlock) {
    const { west, usdp } = await this.persistService.getLastOracles(sqlTx, block.timestamp)
    
    const oldTx = await this.persistService.getTransactionByRequestId(transfer.id, sqlTx)
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
            eastAmount,
            usdpAmount,
            westAmount: transferAmount - westToUsdpAmount,
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
      privateKey: this.configService.envs.EAST_SERVICE_PRIVATE_KEY,
      publicKey: this.configService.envs.EAST_SERVICE_PUBLIC_KEY,
    })
    
    await sqlTx(Tables.TransactionsLog).insert({
      tx_id: await dockerCall.getId(),
      status: TxStatuses.Init,
      type: TxTypes.Issue,
      height: block.height,
      request_tx_id: transfer.id,
      request_tx_timestamp: new Date(transfer.timestamp as string),
      tx_timestamp: new Date(dockerCall.timestamp as string),
      created_at: new Date(),
      address,
      info,
    })
  }
}
