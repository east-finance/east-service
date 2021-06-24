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
  ownerAddress: string
  closeComission = 0.3

  constructor (
    private readonly configService: ConfigService,
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk,
    private readonly userService: UserService,
    private readonly vaultService: VaultService
  ) {
    this.ownerAddress = this.weSdk.tools.getAddressFromPublicKey(this.configService.envs.EAST_SERVICE_PUBLIC_KEY)
  }

  async receiveCallEastContract(sqlTx: Knex.Transaction<any, any[]>, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
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
      case TxTypes.claim_overpay_init:
        await this.сlaimOverpayInit(sqlTx, value, call, block)
        break
      case TxTypes.close_init:
        await this.initClose(sqlTx, call, block)
        break
      case TxTypes.close:
        txId = await this.close(sqlTx, value, call, block)
        break
      case TxTypes.transfer:
        await this.transfer(sqlTx, value, call, block)
        break
      case TxTypes.liquidate:
        await this.liquidate(sqlTx, value, call, block)
        break
    }
    // default balance update
    if ([TxTypes.close, TxTypes.mint, TxTypes.reissue].includes(firstParam.key)) {
      const balancesUpdated = call.resultsList?.filter(row => row.key.startsWith(`${StateKeys.balance}_`)) || []
      for (const result of balancesUpdated) {
        const parsed = result.key.split('_')
        await this.vaultService.addBalance({
          id: txId,
          address: parsed[1],
          type: firstParam.key,
          east_amount: result.value,
          sqlTx
        })
      }
    }
  }

  async liquidate(sqlTx: Knex.Transaction<any, any[]>, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    const liquidatedResult = call.resultsList?.find(row => row.key.startsWith(`${StateKeys.liquidatedVault}_${firstParam.address}`))
    const liquidatedVault = JSON.parse(liquidatedResult.value)

    const [id] = await sqlTx(Tables.TransactionsLog).insert({
      tx_id: call.tx.callContractTransaction.id,
      address: firstParam.address,
      status: TxStatuses.Executed,
      type: TxTypes.liquidate,
      height: block.height,
      executed_tx_id: call.id,
      tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
      params: firstParam,
    }).returning('id')

    await this.vaultService.addVaultLog({
      txId: id,
      vault: {
        ...liquidatedVault,
        isActive: false
      },
      address: firstParam.address,
      sqlTx
    })
  }

  async transfer(sqlTx: Knex.Transaction<any, any[]>, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    const addressFrom = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    const addressTo = firstParam.to

    const balancesUpdated = call.resultsList?.filter(row => row.key.startsWith(`${StateKeys.balance}_`)) || []
    const balanceFrom = balancesUpdated.find(row => row.key === `${StateKeys.balance}_${addressFrom}`)
    const balanceTo = balancesUpdated.find(row => row.key === `${StateKeys.balance}_${addressTo}`)

    const resFrom = await sqlTx(Tables.TransactionsLog).insert({
      tx_id: call.tx.callContractTransaction.id,
      address: addressFrom,
      status: TxStatuses.Executed,
      type: TxTypes.transfer,
      height: block.height,
      executed_tx_id: call.id,
      tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
      params: firstParam,
    }).returning('id')

    await this.vaultService.addBalance({
      id: resFrom[0],
      address: addressFrom,
      type: TxTypes.transfer,
      east_amount: balanceFrom.value,
      sqlTx
    })

    const resTo = await sqlTx(Tables.TransactionsLog).insert({
      tx_id: call.tx.callContractTransaction.id,
      address: addressTo,
      status: TxStatuses.Executed,
      type: TxTypes.transfer,
      height: block.height,
      executed_tx_id: call.id,
      tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
      params: firstParam,
    }).returning('id')

    await this.vaultService.addBalance({
      id: resTo[0],
      address: addressTo,
      type: TxTypes.transfer,
      east_amount: balanceTo.value,
      sqlTx
    })
  }

  async сlaimOverpayInit(sqlTx: Knex.Transaction<any, any[]>, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    const address = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    
    const vaultKey = await this.weSdk.API.Node.contracts.getKey(
      this.configService.envs.EAST_CONTRACT_ID,
      `${StateKeys.vault}_${address}`
    ) as any

    if (!vaultKey.value) {
      await sqlTx(Tables.TransactionsLog).insert({
        tx_id: call.tx.callContractTransaction.id,
        address,
        status: TxStatuses.Declined,
        type: TxTypes.claim_overpay_init,
        request_tx_id: call.tx.callContractTransaction.id,
        request_tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as number),
        request_params: {},
        height: block.height,
        tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
        params: JSON.stringify(firstParam),
        error: `Vault for address ${address} not exists`
      })
      return
    }

    const vault = JSON.parse(vaultKey.value) as IVault

    const westRateKey = await this.weSdk.API.Node.contracts.getKey(
      this.configService.envs.ORACLE_CONTRACT_ID,
      this.configService.envs.WEST_ORACLE_STREAM
    ) as any
    const westRate = JSON.parse(westRateKey.value)

    const usdapRateKey = await this.weSdk.API.Node.contracts.getKey(
      this.configService.envs.ORACLE_CONTRACT_ID,
      this.configService.envs.RWA_ORACLE_STREAM
    ) as any
    const usdapRate = JSON.parse(usdapRateKey.value)
    
    const westPart = 1 - this.configService.envs.EAST_USDAP_PART
    const westCollateral = this.configService.envs.EAST_WEST_COLLATERAL
    
    const westExpectedUsdValue = vault.eastAmount * westPart * usdapRate.value * westCollateral
    const expectedWestAmount = westExpectedUsdValue / westRate.value

    let returnedAmount = vault.westAmount - expectedWestAmount
    if (Number(firstParam.amount) < returnedAmount) {
      returnedAmount = Number(firstParam.amount)
    }
    returnedAmount = Math.round(returnedAmount * 100000000)

    if (returnedAmount <= 0) {
      await sqlTx(Tables.TransactionsLog).insert({
        tx_id: call.tx.callContractTransaction.id,
        address,
        status: TxStatuses.Declined,
        type: TxTypes.claim_overpay_init,
        request_tx_id: call.tx.callContractTransaction.id,
        request_tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as number),
        request_params: {},
        height: block.height,
        tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
        params: JSON.stringify(firstParam),
        error: `No WEST to return, westRate: ${westRate}`
      })
      return
    }

    const overpayTransfer = this.weSdk.API.Transactions.Transfer.V3({
      recipient: address,
      assetId: '',
      amount: returnedAmount,
      timestamp: Date.now(),
      attachment: call.tx.callContractTransaction.id,
      atomicBadge: {
        trustedSender: this.ownerAddress
      }
    })
    
    const overpayCall = this.weSdk.API.Transactions.CallContract.V4({
      contractId: this.configService.envs.EAST_CONTRACT_ID,
      contractVersion: 1,
      timestamp: Date.now(),
      params: [{
        type: 'string',
        key: TxTypes.claim_overpay,
        value: JSON.stringify({
          transferId: await overpayTransfer.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
          address,
          requestId: call.tx.callContractTransaction.id
        })
      }],
      atomicBadge: {
        trustedSender: this.ownerAddress
      }
    })
    
    const transactions = [overpayTransfer, overpayCall]

    await this.weSdk.API.Transactions.broadcastAtomic(
      this.weSdk.API.Transactions.Atomic.V1({transactions}),
      this.configService.getKeyPair()
    )

    await sqlTx(Tables.TransactionsLog).insert({
      tx_id: await overpayCall.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
      address,
      status: TxStatuses.Init,
      type: TxTypes.claim_overpay_init,
      request_tx_id: call.tx.callContractTransaction.id,
      request_tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as number),
      request_params: {},
      height: block.height,
      tx_timestamp: new Date(call.tx.callContractTransaction.timestamp as string),
      params: JSON.stringify(firstParam),
    })
  }

  async close(sqlTx: Knex.Transaction<any, any[]>, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
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

    await this.vaultService.addVaultLog({
      txId: id,
      vault: {
        eastAmount: 0,
        westAmount: 0,
        rwaAmount: 0,
        westRate: {},
        rwaRate: {},
        isActive: false
      },
      address: firstParam.address,
      sqlTx
    })

    return id
  }

  async initClose(sqlTx: Knex.Transaction<any, any[]>, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
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
  
    const rwaTransfer = this.weSdk.API.Transactions.Transfer.V3({
      recipient: address,
      assetId: this.configService.envs.USDAP_TOKEN_ID,
      amount: Math.round(vault.rwaAmount * 100000000),
      timestamp: Date.now(),
      attachment: '',
      atomicBadge: {
        trustedSender: this.ownerAddress
      }
    })

    const params = {
      address,
      westTransferId: await westTransfer.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
      rwaTransferId: await rwaTransfer.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
      requestId: call.tx.callContractTransaction.id
    }
    
    const closeCall = this.weSdk.API.Transactions.CallContract.V4({
      contractId: this.configService.envs.EAST_CONTRACT_ID,
      contractVersion: 1,
      timestamp: Date.now(),
      params: [{
        type: 'string',
        key: TxTypes.close,
        value: JSON.stringify(params)
      }],
      atomicBadge: {
        trustedSender: this.ownerAddress
      }
    })
    
    const atomicTx = this.weSdk.API.Transactions.Atomic.V1({
      timestamp: Date.now(),
      transactions: [westTransfer, rwaTransfer, closeCall]
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

  async receiveTypicalTx(txType: TxTypes, sqlTx: Knex.Transaction<any, any[]>, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    let address = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    if (txType === TxTypes.claim_overpay) {
      address = firstParam.address
    }

    let vaultId

    if (txType === TxTypes.mint) {
      vaultId = call.tx.callContractTransaction.id
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
      vault: vaultParsed,
      address,
      sqlTx,
      vaultId,
    })

    return id
  }
}
