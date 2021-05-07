import { Injectable, Inject } from '@nestjs/common'
import { DB_CON_TOKEN, IVault, Tables } from '../common/constants'
import { Knex } from 'knex'


@Injectable()
export class VaultService {
  maxDiff: number
  usdpPartInPosition: number

  constructor (
    @Inject(DB_CON_TOKEN) readonly knex: Knex
  ) {}

  async createVault({
    txId,
    vaultId,
    createdAt,
    vault,
    sqlTx
  } : {
    txId: string,
    vaultId: string,
    createdAt: Date,
    vault: IVault,
    sqlTx?: any
  }) {
    // TODO make some actions
    await (sqlTx || this.knex)(Tables.VaultLog).insert({
      id: txId,
      vault_id: vaultId,
      address: vault.address,
      west_amount: vault.westAmount,
      east_amount: vault.eastAmount,
      usdp_amount: vault.usdpAmount,
      west_rate_timestamp: new Date(vault.westRateTimestamp),
      usdp_rate_timestamp: new Date(vault.usdpRateTimestamp),
      created_at: createdAt
    })
  }
}
