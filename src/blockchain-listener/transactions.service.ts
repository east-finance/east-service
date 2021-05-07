import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { DB_CON_TOKEN, TxTypes, Operations, TxStatuses, StateKeys, Tables, MintParam, IVault } from '../common/constants'
import { ParsedIncomingFullGrpcTxType } from '@wavesenterprise/js-sdk'
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
    switch (firstParam.key) {

      case Operations.mint:
        const { transferId } = JSON.parse(firstParam.value) as MintParam

        const vaultInfo = call.resultsList?.find(res => res.key === `${StateKeys.vault}_${call.tx.callContractTransaction.id}`)
        const vaultParsed = JSON.parse(vaultInfo.value) as IVault

        const [id] = await sqlTx(Tables.TransactionsLog).insert({
          tx_id: call.tx.callContractTransaction.id,
          status: TxStatuses.Executed,
          type: TxTypes.Issue,
          height: block.height,
          request_tx_id: transferId,
          tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
          created_at: new Date(),
          address: vaultParsed.address,
          executed_tx_id: call.id,
          info: vaultParsed,
        }).returning('id')

        // save vault
        await this.vaultService.createVault({
          txId: id,
          vaultId: call.tx.callContractTransaction.id,
          createdAt: new Date(call.timestamp as string),
          vault: vaultParsed,
          sqlTx
        })
        
        // save balance
        const balanceInfo = call.resultsList?.find(res => res.key === `${StateKeys.balance}_${vaultParsed.address}`)
        const balanceParsed = JSON.parse(balanceInfo.value)
        await sqlTx(Tables.BalanceLog).insert({
          id,
          address: vaultParsed.address,
          east_amount: balanceParsed
        })
        break
      default:
        Logger.warn(`Unknown east contract params: ${firstParam}`)
        break
    }
  }
}
