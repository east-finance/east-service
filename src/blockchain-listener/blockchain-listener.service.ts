import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { ParsedIncomingGrpcTxType, ParsedIncomingFullGrpcTxType, TRANSACTION_TYPES, WeSdk } from '@wavesenterprise/js-sdk'
import { GrpcListener, ConfigRpc, NodeBlock } from '@wavesenterprise/grpc-listener'
import { PersistService } from './persist.service'
import { TransactionService } from './transactions.service'
import { WE_SDK_PROVIDER_TOKEN } from '../common/constants'

const guard = <T>(obj: any): obj is T => true

@Injectable()
export class BlockchainListenerService {
  nodeAddress: string[]
  config: ConfigRpc
  listener: GrpcListener
  eastTransferAddress: string

  constructor (
    private readonly configService: ConfigService,
    private readonly persistService: PersistService,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk,
    private readonly transactionService: TransactionService,
  ) {
    const nodeAddress = this.configService.getGrpcAddresses()

    this.config = {
      addresses: nodeAddress,
      logger: {
        info: Logger.log.bind(Logger),
        error: Logger.error.bind(Logger),
        warn: Logger.warn.bind(Logger)
      },
      auth: configService.getAuthOptions(),
      asyncGrpc: false,
      getLastBlocksSignature: this.getLastBlockSignature,
      filters: {
        tx_types: [ 105, TRANSACTION_TYPES.Transfer, TRANSACTION_TYPES.Atomic ]
      },
      txLifetime: configService.getTxLifetime()
    }

    this.eastTransferAddress = this.weSdk.tools.getAddressFromPublicKey(this.configService.envs.EAST_SERVICE_PUBLIC_KEY)
  }

  async start() {
    this.listener = new GrpcListener(this.config)
    await this.listener.listen({
      rollbackLastBlock: this.persistService.rollbackLastBlock,
      rollbackToBlockSignature: this.persistService.rollbackToBlockSignature,
      receiveTxs: this.receiveTxs,
      receiveCriticalError: this.receiveError
    })
  }

  getLastBlockSignature = async () => {
    const dbSignature = await this.persistService.getLastBlocksSignature()
    if (dbSignature) {
      Logger.log(`Using start block signature from DB: '${dbSignature}'`)
      return dbSignature
    }
    try {
      const eastCreateTx = await this.weSdk.API.Node.transactions.get(this.configService.envs.EAST_CONTRACT_ID)
      const block: any = await this.weSdk.API.Node.blocks.at(eastCreateTx.height)
      const blockSignature = block.reference
      Logger.log(`Using start block signature from Node: '${blockSignature}'`)
      return blockSignature
    } catch (e) {
      Logger.error(`Cannot get EAST contract ('${this.configService.envs.EAST_CONTRACT_ID}') block signature: ${e.message}. Check that the EAST DockerCreate transaction is already in the blockchain.`)
    }
    process.exit(1)
  }

  receiveTxs = async (block: NodeBlock, txs: ParsedIncomingGrpcTxType[]) => {
    await this.persistService.knex.transaction(async trx => {
      // save block
      try {
        await this.persistService.saveBlock(trx, block)

        for (const index in txs) {
          const incomingTx = txs[index]
          // RECEIVE CALL ORACLE CONTRACT
          try {
            if (incomingTx.grpcType === 'executedContractTransaction' &&
              guard<ParsedIncomingFullGrpcTxType['executedContractTransaction']>(incomingTx) && incomingTx.tx) {
              const subTx = incomingTx.tx
              if (subTx.callContractTransaction) {
                if (subTx.callContractTransaction.contractId === this.configService.envs.ORACLE_CONTRACT_ID) {
                  await this.persistService.saveOracle(trx, incomingTx, block)
                }

                if (subTx.callContractTransaction.contractId === this.configService.envs.EAST_CONTRACT_ID) {
                  await this.transactionService.receiveCallEastContract(trx, incomingTx, block)
                }
              }
            }

            // RECEIVE TRANSFER - ISSUE EAST TO ADDRESS
            if (incomingTx.grpcType === 'atomicTransaction' &&
              guard<ParsedIncomingFullGrpcTxType['atomicTransaction']>(incomingTx)) {
              const length = incomingTx.transactionsList?.length
              if (length) {
                for (let i = 0; i < length; i++) {
                  const tx = (incomingTx.transactionsList as any[])[i]

                  if (tx.grpcType === 'executedContractTransaction'
                    && guard<ParsedIncomingFullGrpcTxType['executedContractTransaction']>(tx)
                    && tx.tx
                    && tx.tx.callContractTransaction
                    && tx.tx.callContractTransaction.contractId === this.configService.envs.EAST_CONTRACT_ID
                  ) {
                    await this.transactionService.receiveCallEastContract(trx, tx, block)
                  }
                }
              }
            }
          } catch (err) {
            Logger.error('Catch error, while process incoming tx:')
            Logger.error(JSON.stringify(incomingTx))
            throw err
          }
        }
      } catch(err) {
        Logger.error(err)
        throw err
      }
    })
  }

  receiveError = async (err: Error) => {
    console.trace(err)
    process.exit(1)
  }
}
