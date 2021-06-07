import { Injectable, Inject } from '@nestjs/common'
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
import { UserService } from '../user/user.service'


@Injectable()
export class TransactionService {
  maxDiff: number
  usdpPartInPosition: number
  ownerAddress: string
  closeComission = 0.3

  constructor (
    private readonly configService: ConfigService,
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk,
    private readonly userService: UserService,
    private readonly vaultService: VaultService
  ) {
    this.maxDiff = this.configService.envs.EXPIRED_ORACLE_DATA
    const { EAST_USDP_PART, EAST_WEST_COLLATERAL } = this.configService.envs
    this.usdpPartInPosition = EAST_USDP_PART / ((1 - EAST_USDP_PART) * EAST_WEST_COLLATERAL + EAST_USDP_PART)
    this.ownerAddress = this.weSdk.tools.getAddressFromPublicKey(this.configService.envs.EAST_SERVICE_PUBLIC_KEY)
  }

  async receiveCallEastContract(sqlTx: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    const firstParam = call.tx.callContractTransaction.paramsList && call.tx.callContractTransaction.paramsList[0]
    if (!firstParam) {
      return
    }
    const value = firstParam.value ? JSON.parse(firstParam.value) : {}
    let txId;
    switch (firstParam.key) {
      case TxTypes.mint:
        txId = await this.receiveTypicalTx(TxTypes.mint, sqlTx, value, call, block)
        break
      case TxTypes.supply:
        await this.receiveTypicalTx(TxTypes.supply, sqlTx, value, call, block)
        break
      case TxTypes.reissue:
        txId = await this.receiveTypicalTx(TxTypes.reissue, sqlTx, value, call, block)
        break
      case TxTypes.claim_overpay:
        await this.receiveTypicalTx(TxTypes.claim_overpay, sqlTx, value, call, block)
        break
      case TxTypes.close_init:
        await this.initClose(sqlTx, call, block)
        break
      case TxTypes.close:
        txId = await this.close(sqlTx, value, call, block)
        break
    }
    // default balance update
    if ([TxTypes.close, TxTypes.mint, TxTypes.reissue, TxTypes.transfer].includes(firstParam.key)) {
      const balancesUpdated = call.resultsList?.filter(row => row.key.startsWith(`${StateKeys.balance}_`)) || []
      for (const result of balancesUpdated) {
        const parsed = result.key.split('_')
        await sqlTx(Tables.BalanceLog).insert({
          id: txId,
          address: parsed[1],
          type: firstParam.key,
          east_amount: result.value
        })
      }
    }
  }

  async close(sqlTx: any, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    const [id] = await sqlTx(Tables.TransactionsLog).insert({
      tx_id: call.tx.callContractTransaction.id,
      address: firstParam.address,
      status: TxStatuses.Executed,
      type: TxTypes.close,
      height: block.height,
      executed_tx_id: call.id,
      tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
      params: firstParam,
    }).returning('id')

    const vaultId = (await this.userService.getCurrentVault(firstParam.address)).vaultId

    await this.vaultService.addVaultLog({
      txId: id,
      vaultId,
      vault: {
        eastAmount: 0,
        westAmount: 0,
        usdpAmount: 0,
        westRate: {},
        usdpRate: {},
      },
      address: firstParam.address,
      sqlTx
    })

    return id
  }

  async initClose(sqlTx: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    const address = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    const vault = await this.userService.getCurrentVault(address)

    const westTransfer = this.weSdk.API.Transactions.Transfer.V3({
      recipient: address,
      amount: Math.round((vault.westAmount - this.closeComission) * 100000000),
      timestamp: Date.now(),
      attachment: '',
      atomicBadge: {
        trustedSender: this.ownerAddress
      }
    })
  
    const usdpTransfer = this.weSdk.API.Transactions.Transfer.V3({
      recipient: address,
      assetId: this.configService.envs.USDAP_TOKEN_ID,
      amount: Math.round(vault.usdpAmount * 100000000),
      timestamp: Date.now(),
      attachment: '',
      atomicBadge: {
        trustedSender: this.ownerAddress
      }
    })

    const params = {
      address,
      westTransferId: await westTransfer.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
      usdpTransferId: await usdpTransfer.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
      requestId: call.tx.callContractTransaction.id
    }
    
    const closeCall = this.weSdk.API.Transactions.CallContract.V4({
      contractId: this.configService.envs.EAST_CONTRACT_ID,
      contractVersion: 1,
      timestamp: Date.now(),
      params: [{
        type: 'string',
        key: 'close',
        value: JSON.stringify(params)
      }],
      atomicBadge: {
        trustedSender: this.ownerAddress
      }
    })
    
    const atomicTx = this.weSdk.API.Transactions.Atomic.V1({
      timestamp: Date.now(),
      transactions: [westTransfer, usdpTransfer, closeCall]
    })

    await this.weSdk.API.Transactions.broadcastAtomicGrpc(
      atomicTx,
      this.configService.getKeyPair()
    )

    await sqlTx(Tables.TransactionsLog).insert({
      tx_id: await closeCall.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
      address,
      status: TxStatuses.Init,
      type: TxTypes.close_init,
      request_tx_id: call.tx.callContractTransaction.id,
      request_tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as number),
      request_params: {},
      height: block.height,
      tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
      params,
    })
  }

  async receiveTypicalTx(txType: TxTypes, sqlTx: any, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    let address = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    let vaultId = call.tx.callContractTransaction.id

    if (txType !== TxTypes.mint) {
      vaultId = (await this.userService.getCurrentVault(address)).vaultId
    }

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
    await this.vaultService.addVaultLog({
      txId: id,
      vaultId,
      vault: vaultParsed,
      address,
      sqlTx
    })

    return id
  }
}
