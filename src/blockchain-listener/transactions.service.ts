import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import {
  DB_CON_TOKEN,
  TxTypes,
  TxStatuses,
  StateKeys,
  Tables,
  IVault,
  WE_SDK_PROVIDER_TOKEN
} from '../common/constants'
import { ParsedIncomingFullGrpcTxType, WeSdk } from '@wavesenterprise/js-sdk'
import { NodeBlock } from '@wavesenterprise/grpc-listener'
import { Knex } from 'knex'
import { VaultService } from './vault.service'


@Injectable()
export class TransactionService {
  maxDiff: number
  usdpPartInPosition: number

  constructor (
    private readonly configService: ConfigService,
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk,
    private readonly vaultService: VaultService
  ) {
    this.maxDiff = this.configService.envs.EXPIRED_ORACLE_DATA
    const { EAST_USDP_PART, EAST_WEST_COLLATERAL } = this.configService.envs
    this.usdpPartInPosition = EAST_USDP_PART / ((1 - EAST_USDP_PART) * EAST_WEST_COLLATERAL + EAST_USDP_PART)
  }

  async receiveCallEastContract(sqlTx: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    const firstParam = call.tx.callContractTransaction.paramsList && call.tx.callContractTransaction.paramsList[0]
    if (!firstParam) {
      return
    }
    const value = firstParam.value ? JSON.parse(firstParam.value) : {};
    switch (firstParam.key) {
      case TxTypes.mint:
        await this.receiveTypicalTx(TxTypes.mint, sqlTx, value, call, block)
        break
      case TxTypes.supply:
        await this.receiveTypicalTx(TxTypes.supply, sqlTx, value, call, block)
        break
      case TxTypes.reissue:
        await this.receiveTypicalTx(TxTypes.reissue, sqlTx, value, call, block)
        break
      case TxTypes.claim_overpay:
        await this.receiveTypicalTx(TxTypes.claim_overpay, sqlTx, value, call, block)
        break
      default:
        Logger.warn(`Unknown east contract params: ${firstParam}`)
        break
    }
  }

  async receiveTypicalTx(txType: TxTypes, sqlTx: any, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    let address = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    if (txType === TxTypes.claim_overpay) {
      address = firstParam.address
    }
    const vaultInfo = call.resultsList?.find(res => res.key === `${StateKeys.vault}_${address}`)
    const vaultParsed = JSON.parse(vaultInfo.value) as IVault

    const [id] = await sqlTx(Tables.TransactionsLog).insert({
      tx_id: call.tx.callContractTransaction.id,
      address,
      status: TxStatuses.Executed,
      type: txType,
      height: block.height,
      executed_tx_id: call.id,
      tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
      params: firstParam,
    }).returning('id')

    // save vault
    await this.vaultService.createVault({
      txId: id,
      vault: vaultParsed,
      address,
      sqlTx
    })
  }
}
