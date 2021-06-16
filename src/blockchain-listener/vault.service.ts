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
      east_amount_diff: east_amount - oldBalance.eastAmount
    })
  }

  async addVaultLog({txId, vault, address, sqlTx, vaultId} : {
    txId: string,
    vault: IVault,
    address: string,
    sqlTx?: any,
    vaultId?: string
  }) {
    const isActive = typeof vault.isActive === 'boolean' ? vault.isActive : true
    const oldVault = await this.userService.getCurrentVault(address)
    // TODO make some actions
    await (sqlTx || this.knex)(Tables.VaultLog).insert({
      id: txId,
      vault_id: vaultId || oldVault.vaultId,
      address,
      west_amount: vault.westAmount || 0,
      east_amount: vault.eastAmount || 0,
      usdp_amount: vault.usdpAmount || 0,
      west_amount_diff: oldVault ? (vault.westAmount || 0) - oldVault.westAmount : vault.westAmount,
      east_amount_diff: oldVault ? (vault.eastAmount || 0) - oldVault.eastAmount : vault.eastAmount,
      usdp_amount_diff: oldVault ? (vault.usdpAmount || 0) - oldVault.usdpAmount : vault.usdpAmount,
      west_rate: vault.westRate && vault.westRate.value,
      usdp_rate: vault.usdpRate && vault.usdpRate.value,
      west_rate_timestamp: vault.westRate && vault.westRate.timestamp ? new Date(+vault.westRate.timestamp) : null,
      usdp_rate_timestamp: vault.usdpRate && vault.usdpRate.timestamp ? new Date(+vault.usdpRate.timestamp) : null,
      is_active: isActive
    })
  }
}
