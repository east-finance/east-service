import { Inject } from '@nestjs/common'
import { DB_CON_TOKEN } from '../common/constants'
import { Knex } from 'knex'


export class UserService {

  constructor (
    @Inject(DB_CON_TOKEN) readonly knex: Knex
  ) {}

  async getTransactions(address: string, limit: number, offset = 0) {
    const select = {
      requestTxId: 'transactions.request_tx_id',
      callTxId: 'transactions.tx_id',
      address: 'transactions.address',
      requestHeight: 'transactions.height',
      callHeight: 'executed_transactions.height',
      callTimestamp: 'executed_transactions.call_timestamp',
      transactionType: 'transactions.transaction_type',
      amount: 'transactions.amount',
      info: 'transactions.info',
    }

    const transactions = await this.knex('transactions')
      .select(select)
      .where('transactions.address', address)
      .leftJoin('executed_transactions', 'transactions.tx_id', 'executed_transactions.tx_id')
      .orderBy('transactions.timestamp', 'asc')
      .limit(limit)
      .offset(offset)

    const totalAmount = transactions.reduce((sum: any, current: any) => {
      if (current.transaction_type === 'issue') {
        sum = sum + current.amount
      }
      return sum
    }, 0)

    return {
      totalAmount,
      address,
      transactions
    }
  }
}
