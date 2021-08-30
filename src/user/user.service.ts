import { Inject } from '@nestjs/common'
import { ContractExecutionStatuses, DB_CON_TOKEN, Tables, TxStatuses } from '../common/constants'
import { Knex } from 'knex'
import { Vault, Balance, UserContractCallTxRequest } from './transactions.dto'


export class UserService {

  constructor (
    @Inject(DB_CON_TOKEN) readonly knex: Knex
  ) {}

  getOracles(stream: string, dateFrom?: Date, dateTo?: Date, limit?: number) {
    const knex = this.knex
    const select = {
      value: knex.raw(`"${Tables.Oracles}"."value"`),
      timestamp: `${Tables.Oracles}.timestamp`
    }

    const req = knex(Tables.Oracles)
      .select(select)
      .andWhere({stream_id: stream})
      .orderBy('timestamp', 'desc')

    if (dateFrom)  {
      req.andWhere('timestamp', '>', dateFrom)
    }

    if (dateTo)  {
      req.andWhere('timestamp', '<', dateTo)
    }

    if (limit) {
      req.limit(limit)
    }

    return req
  }

  async getCurrentBalance(address: string): Promise<Balance> {
    const knex = this.knex
    const select = {
      id: `${Tables.BalanceLog}.id`,
      address: `${Tables.BalanceLog}.address`,
      eastAmount: `${Tables.BalanceLog}.east_amount`,
      eastAmountDiff: `${Tables.BalanceLog}.east_amount_diff`,
      type: `${Tables.BalanceLog}.type`,
    }

    const [ res ] = await knex(Tables.BalanceLog)
      .select(select)
      .where({address})
      .orderBy('id', 'desc')
      .limit(1)

    return res || { eastAmount: 0, address }
  }

  async getCurrentVault(address: string): Promise<Vault> {
    const knex = this.knex
    const select = {
      id: `${Tables.VaultLog}.id`,
      vaultId: `${Tables.VaultLog}.vault_id`,
      address: `${Tables.VaultLog}.address`,
      westAmount: `${Tables.VaultLog}.west_amount`,
      eastAmount: `${Tables.VaultLog}.east_amount`,
      rwaAmount: `${Tables.VaultLog}.rwa_amount`,
      westRate: `${Tables.VaultLog}.west_rate`,
      rwaRate: `${Tables.VaultLog}.rwa_rate`,
      westRateTimestamp: `${Tables.VaultLog}.west_rate_timestamp`,
      rwaRateTimestamp: `${Tables.VaultLog}.rwa_rate_timestamp`,
      isActive: `${Tables.VaultLog}.is_active`,
      createdAt: `${Tables.VaultLog}.created_at`
    }

    const [ res ] = await knex(Tables.VaultLog)
      .select(select)
      .where({address})
      .orderBy('id', 'desc')
      .limit(1)
                
    return res
  }

  async getVaults(address: string, limit: number, offset = 0) {
    const knex = this.knex
    const select = {
      id: `${Tables.VaultLog}.id`,
      vaultId: `${Tables.VaultLog}.vault_id`,
      address: `${Tables.VaultLog}.address`,
      westAmount: `${Tables.VaultLog}.west_amount`,
      eastAmount: `${Tables.VaultLog}.east_amount`,
      rwaAmount: `${Tables.VaultLog}.rwa_amount`,
      westRateTimestamp: `${Tables.VaultLog}.west_rate_timestamp`,
      rwaRateTimestamp: `${Tables.VaultLog}.rwa_rate_timestamp`,
      isActive: `${Tables.VaultLog}.is_active`,
      createdAt: `${Tables.VaultLog}.created_at`
    }

    return knex.with('last_vaults',
        knex(Tables.VaultLog)
          .select('vault_id', 'id')
          .where({address})
          .distinctOn('vault_id')
          .orderBy(['vault_id', { column: 'id', order: 'desc' }])
          .limit(limit)
          .offset(offset)
      ).select(select)
      .from('last_vaults')
      .leftJoin(Tables.VaultLog, `last_vaults.id`, `${Tables.VaultLog}.id`)
      .orderBy('id', 'desc')
  }

  async getTransactions(address: string, limit: number, offset = 0) {
    // TODO add declined
    const knex = this.knex
    const inintTxs = 'init_txs'
    const executedTxs = 'executed_txs'
    const select = {
      callTxId: knex.raw(`coalesce(${inintTxs}.tx_id, ${executedTxs}.tx_id)`),
      requestTxId: `${inintTxs}.request_tx_id`,
      address: knex.raw(`coalesce(${executedTxs}.address, ${inintTxs}.address)`),
      initHeight: `${inintTxs}.height`,
      callHeight: knex.raw(`coalesce(${executedTxs}.height, ${inintTxs}.height)`),
      executedHeight: knex.raw(`coalesce(${executedTxs}.height, ${inintTxs}.height)`),
      transactionType: knex.raw(`coalesce(${executedTxs}.type, ${inintTxs}.type)`),
      callTimestamp: knex.raw(`coalesce(${inintTxs}.tx_timestamp, ${executedTxs}.tx_timestamp)`),
      status: knex.raw(`coalesce(${executedTxs}.status, ${inintTxs}.status)`),
      params: knex.raw(`coalesce(${inintTxs}.params, ${executedTxs}.params)`),
      westAmountDiff: `${Tables.VaultLog}.west_amount_diff`,
      rwaAmountDiff: `${Tables.VaultLog}.rwa_amount_diff`,
      eastAmountDiff: knex.raw(`coalesce(${Tables.BalanceLog}.east_amount_diff, '0')`)
    }

    // TODO handle TxStatuses.Declined
    const transactions = await knex.with('unique_txs',
        knex(Tables.TransactionsLog)
          .select('id', 'tx_id')
          .where({address})
          .andWhereNot('status', TxStatuses.Declined)
          .distinctOn('tx_id')
          .orderBy(['tx_id', { column: 'id', order: 'desc' }])
          .limit(limit)
          .offset(offset)
      ).select(select)
      .from('unique_txs')
      .leftJoin(`${Tables.TransactionsLog} as ${inintTxs}`, function() {
        this.on(`${inintTxs}.tx_id`, '=', `unique_txs.tx_id`)
          .andOn(knex.raw(`${inintTxs}.status = '${TxStatuses.Init}'`))
          .andOn(knex.raw(`${inintTxs}.address = ?`, [address]))
      })
      .leftJoin(`${Tables.TransactionsLog} as ${executedTxs}`, function() {
        this.on(`${executedTxs}.tx_id`, '=', 'unique_txs.tx_id')
          .andOn(knex.raw(`${executedTxs}.status = '${TxStatuses.Executed}'`))
          .andOn(knex.raw(`${executedTxs}.address = ?`, [address]))
      })
      .leftJoin(`${Tables.BalanceLog}`, `${executedTxs}.id`, '=', `${Tables.BalanceLog}.id`)
      .leftJoin(`${Tables.VaultLog}`, `${executedTxs}.id`, '=', `${Tables.VaultLog}.id`)
      .orderBy(`unique_txs.id`, 'desc')

    return transactions
  }

  async getTransactionStatuses(address: string, limit: number, offset = 0) {
    return this.knex(Tables.UserTransactionStatuses)
      .select()
      .where('address', address)
      .limit(limit)
      .offset(offset)
  }

  async setUserContractCall(tx: UserContractCallTxRequest) {
    return this.knex(Tables.UserTransactionStatuses)
      .insert({
        tx_id: tx.txId,
        address: tx.address,
        status: ContractExecutionStatuses.Pending,
        type: tx.type,
        timestamp: new Date(tx.timestamp),
      })
  }
}
