import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import {
  DB_CON_TOKEN,
  TxTypes,
  TxStatuses,
  StateKeys,
  Tables,
  VaultJson,
  WE_SDK_PROVIDER_TOKEN,
  ContractExecutionStatuses
} from '../common/constants'
import { ParsedIncomingFullGrpcTxType, WeSdk } from '@wavesenterprise/js-sdk'
import { NodeBlock } from '@wavesenterprise/grpc-listener'
import { Knex } from 'knex'
import { VaultService } from './vault.service'
import { UserService } from '../user/user.service'
import { parseVault } from '../common/parse-vault'


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
    this.init()
  }

  private init() {
    try {
      this.ownerAddress = this.weSdk.tools.getAddressFromPublicKey(this.configService.envs.EAST_SERVICE_PUBLIC_KEY)
      Logger.log('Get EAST contract address successfully completed.')
    } catch (err) {
      throw new Error('Can not get EAST contract owner address.')
    }
  }

  async receiveCallEastContract(sqlTx: Knex.Transaction<any, any[]>, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    Logger.log(`Receive call EAST contract. Tx id - ${call.tx.callContractTransaction.id}`)
    const firstParam = call.tx.callContractTransaction.paramsList && call.tx.callContractTransaction.paramsList[0]
    if (!firstParam) {
      return
    }
    const value = firstParam.value ? JSON.parse(firstParam.value) : {}
    Logger.log(`Call - ${firstParam.key}. Value: ${firstParam.value}`)
    let txId;
    try {
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
    } catch (err) {
      Logger.error(`Transaction processing error: tx id - ${call.tx.callContractTransaction.id}, tx type - ${firstParam.key},\n${err.stack}`)
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
    try {
      const liquidatedResult = call.resultsList?.find(row => row.key.startsWith(`${StateKeys.liquidatedVault}_${firstParam.address}`))
      const splittedKey = liquidatedResult.key.split('_')
      const liquidationTimestamp = splittedKey[splittedKey.length - 1]

      let liquidationWestTransferExists
      try {
        await this.weSdk.API.Node.contracts.getKey(
          this.configService.getEastContractId(),
          `${StateKeys.liquidationExchange}_${firstParam.address}_${liquidationTimestamp}`,
        )
        liquidationWestTransferExists = true
      } catch (err) {
        liquidationWestTransferExists = false
      }

      const liquidatedVault = parseVault(JSON.parse(liquidatedResult.value))

      if (!liquidationWestTransferExists) {
        const transferCall = this.weSdk.API.Transactions.Transfer.V3({
          recipient: this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey),
          assetId: '',
          amount: liquidatedVault.liquidatedWestAmount! * 100000000,
          timestamp: Date.now(),
          attachment: '',
          atomicBadge: {
            trustedSender: this.ownerAddress,
          },
        })

        const writeLiquidationWestTransferCall = this.weSdk.API.Transactions.CallContract.V4({
          contractId: this.configService.envs.EAST_CONTRACT_ID,
          contractVersion: 1,
          timestamp: Date.now(),
          params: [{
            type: 'string',
            key: TxTypes.write_liquidation_west_transfer,
            value: JSON.stringify({
              address: firstParam.address,
              timestamp: liquidationTimestamp,
            })
          }],
          atomicBadge: {
            trustedSender: this.ownerAddress,
          },
        })

        await this.weSdk.API.Transactions.broadcastAtomic(
          this.weSdk.API.Transactions.Atomic.V1({ transactions: [transferCall, writeLiquidationWestTransferCall] }),
          this.configService.getKeyPair()
        )
      }

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
    } catch (err) {
      throw new Error('Liquidate handler error:\n' + err.stack)
    }
  }

  async transfer(sqlTx: Knex.Transaction<any, any[]>, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    let addressFrom: string
    try {
      addressFrom = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    } catch (err) {
      throw new Error(`Transfer handler error: can not get address from public key - ${call.tx.callContractTransaction.senderPublicKey}`)
    }
    try {
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
    } catch (err) {
      throw new Error(`Transfer handler error: ${err.message}`)
    }
  }

  async сlaimOverpayInit(sqlTx: Knex.Transaction<any, any[]>, firstParam: any, call: ParsedIncomingFullGrpcTxType['executedContractTransaction'], block: NodeBlock) {
    let address: string
    try {
      address = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    } catch (err) {
      throw new Error(`ClaimOverpayInit handler error: can not get address from public key - ${call.tx.callContractTransaction.senderPublicKey}`)
    }

    let vaultKey: any
    try {
      vaultKey = await this.weSdk.API.Node.contracts.getKey(
        this.configService.envs.EAST_CONTRACT_ID,
        `${StateKeys.vault}_${address}`
      ) as any
    } catch (err) {
      throw new Error(`ClaimOverpayInit handler error: we sdk error, can not get state from contract. Key - ${StateKeys.vault}_${address}, contract id - ${this.configService.envs.EAST_CONTRACT_ID}.`)
    }

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
      throw new Error(`ClaimOverpayInit handler error: vault for address ${address} not exists`)
    }

    const vaultJson = JSON.parse(vaultKey.value) as VaultJson
    const vault = parseVault(vaultJson)

    let westRateKey: any
    try {
      westRateKey = await this.weSdk.API.Node.contracts.getKey(
        this.configService.envs.ORACLE_CONTRACT_ID,
        this.configService.envs.WEST_ORACLE_STREAM
      ) as any
    } catch (err) {
      throw new Error(`ClaimOverpayInit handler error: we sdk error, can not get state from contract. Key - ${this.configService.envs.WEST_ORACLE_STREAM}, contract id - ${this.configService.envs.ORACLE_CONTRACT_ID}.`)
    }
    const westRate = JSON.parse(westRateKey.value)

    let usdapRateKey: any
    try {
      usdapRateKey = await this.weSdk.API.Node.contracts.getKey(
        this.configService.envs.ORACLE_CONTRACT_ID,
        this.configService.envs.RWA_ORACLE_STREAM
      ) as any
    } catch (err) {
      throw new Error(`ClaimOverpayInit handler error: we sdk error, can not get state from contract. Key - ${this.configService.envs.RWA_ORACLE_STREAM}, contract id - ${this.configService.envs.ORACLE_CONTRACT_ID}.`)
    }
    const usdapRate = JSON.parse(usdapRateKey.value)

    const westPart = 1 - this.configService.envs.EAST_USDAP_PART
    const westCollateral = this.configService.envs.EAST_WEST_COLLATERAL

    let westExpectedUsdValue = vault.eastAmount * westPart * usdapRate.value * westCollateral
    if (this.configService.envs.EAST_USDAP_PART === 0) {
      westExpectedUsdValue = vault.eastAmount * westPart * westCollateral
    }
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
      throw new Error(`ClaimOverpayInit handler error: no WEST to return, westRate: ${westRate}`)
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

    await sqlTx(Tables.UserTransactionStatuses).insert({
      tx_id: await overpayCall.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
      address,
      status: ContractExecutionStatuses.Pending,
      type: TxTypes.claim_overpay,
      timestamp: new Date(),
    })

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
    let address: string
    try {
      address = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    } catch (err) {
      throw new Error(`InitClose handler error: can not get address from public key - ${call.tx.callContractTransaction.senderPublicKey}`)
    }

    let vault
    try {
      vault = await this.userService.getCurrentVault(address)
    } catch (err) {
      throw new Error(`InitClose handler error: can not get vault by address ${address}`)
    }

    const atomicTransactionsArray: any[] = []

    const params: Record<string, any> = {
      address,
      requestId: call.tx.callContractTransaction.id
    }

    if (vault.westAmount > 0) {
      const westTransfer = this.weSdk.API.Transactions.Transfer.V3({
        recipient: address,
        amount: Math.round((vault.westAmount - this.closeComission) * 100000000),
        timestamp: Date.now(),
        attachment: '',
        atomicBadge: {
          trustedSender: this.ownerAddress
        }
      })
      atomicTransactionsArray.push(westTransfer)
      params.westTransferId = await westTransfer.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY)
    }

    if (vault.rwaAmount > 0) {
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
      atomicTransactionsArray.push(rwaTransfer)
      params.rwaTransferId = await rwaTransfer.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY)
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
    atomicTransactionsArray.push(closeCall)

    const atomicTx = this.weSdk.API.Transactions.Atomic.V1({
      timestamp: Date.now(),
      transactions: atomicTransactionsArray
    })

    await this.weSdk.API.Transactions.broadcastAtomicGrpc(
      atomicTx,
      this.configService.getKeyPair()
    )

    await sqlTx(Tables.UserTransactionStatuses).insert({
      tx_id: await closeCall.getId(this.configService.envs.EAST_SERVICE_PUBLIC_KEY),
      address,
      status: ContractExecutionStatuses.Pending,
      type: TxTypes.close,
      timestamp: new Date(),
    })

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
    let address: string
    try {
      address = this.weSdk.tools.getAddressFromPublicKey(call.tx.callContractTransaction.senderPublicKey)
    } catch (err) {
      throw new Error(`ReceiveTypicalTx handler error: can not get address from public key - ${call.tx.callContractTransaction.senderPublicKey}`)
    }
    if (txType === TxTypes.claim_overpay) {
      address = firstParam.address
    }

    let vaultId

    if (txType === TxTypes.mint) {
      vaultId = call.tx.callContractTransaction.id
    }

    const vaultInfo = call.resultsList?.find(res => res.key === `${StateKeys.vault}_${address}`)
    const vaultJson = JSON.parse(vaultInfo.value) as VaultJson
    const vault = parseVault(vaultJson)

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
      vault,
      address,
      sqlTx,
      vaultId,
    })

    return id
  }
}
