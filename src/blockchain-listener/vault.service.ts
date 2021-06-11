import { Injectable, Inject } from '@nestjs/common'
import { DB_CON_TOKEN, IVault, Tables } from '../common/constants'
import { UserService } from '../user/user.service'

import { Knex } from 'knex'


@Injectable()
export class VaultService {
  maxDiff: number
  usdpPartInPosition: number

  constructor (
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
    private readonly userService: UserService,
  ) {}

  async addBalance({id, address, type, east_amount, sqlTx} : {
    id: number,
    address: string,
    type: string,
    east_amount: number,
    sqlTx: any
  }) {
    const oldBalance = await this.userService.getCurrentBalance(address)

    await sqlTx(Tables.BalanceLog).insert({
      id,
      address,
      type,
      east_amount,
      east_amount_relative: east_amount - oldBalance.eastAmount
    })
  }

  async addVaultLog({txId, vault, address, sqlTx, vaultId} : {
    txId: string,
    vault: IVault,
    address: string,
    sqlTx?: any,
    vaultId?: string
  }) {
    const oldVault = await this.userService.getCurrentVault(address)
    // TODO make some actions
    await (sqlTx || this.knex)(Tables.VaultLog).insert({
      id: txId,
      vault_id: vaultId || oldVault.vaultId,
      address,
      west_amount: vault.westAmount,
      east_amount: vault.eastAmount,
      usdp_amount: vault.usdpAmount,
      west_amount_relative: oldVault ? vault.westAmount - oldVault.westAmount : vault.westAmount,
      east_amount_relative: oldVault ? vault.eastAmount - oldVault.eastAmount : vault.eastAmount,
      usdp_amount_relative: oldVault ? vault.usdpAmount - oldVault.usdpAmount : vault.usdpAmount,
      west_rate: vault.westRate.value,
      usdp_rate: vault.usdpRate.value,
      west_rate_timestamp: vault.westRate.timestamp ? new Date(+vault.westRate.timestamp) : null,
      usdp_rate_timestamp: vault.usdpRate.timestamp ? new Date(+vault.usdpRate.timestamp) : null
    })
  }
}
