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
    westRate,
    sqlTx
  } : {
    txId: string,
    vaultId: string,
    createdAt: Date,
    vault: IVault,
    westRate: number,
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
      west_rate: westRate,
      created_at: createdAt
    })
  }
}
