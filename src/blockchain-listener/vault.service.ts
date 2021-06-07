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

  async addVaultLog({
    txId,
    vaultId,
    vault,
    address,
    sqlTx
  } : {
    txId: string,
    vaultId: string,
    vault: IVault,
    address: string,
    sqlTx?: any
  }) {
    // TODO make some actions
    await (sqlTx || this.knex)(Tables.VaultLog).insert({
      id: txId,
      vault_id: vaultId,
      address,
      west_amount: vault.westAmount,
      east_amount: vault.eastAmount,
      usdp_amount: vault.usdpAmount,
      west_rate: vault.westRate.value,
      usdp_rate: vault.usdpRate.value,
      west_rate_timestamp: vault.westRate.timestamp ? new Date(+vault.westRate.timestamp) : null,
      usdp_rate_timestamp: vault.usdpRate.timestamp ? new Date(+vault.usdpRate.timestamp) : null
    })
  }
}
