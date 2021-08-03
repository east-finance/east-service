import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import {
  DB_CON_TOKEN,
  Tables,
  WE_SDK_PROVIDER_TOKEN
} from '../common/constants'
import { WeSdk } from '@wavesenterprise/js-sdk'
import { Knex } from 'knex'
import { PersistService } from './persist.service'


@Injectable()
export class LiquidationService {

  constructor (
    private readonly configService: ConfigService,
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk,
    private readonly persistService: PersistService
  ) {}

  async checkVaults() {
    const { knex } = this
    // TODO
    const { EAST_RWA_PART, LIQUIDATION_COLLATERAL } = this.configService.envs
    const westPart = 1 - EAST_RWA_PART
    const { westRate } = await this.persistService.getLastOracles()
    const coef = westRate.value / westPart

    const selectedFields = ['id', 'address', 'vault_id', 'east_amount']
    const liquidatedVaults = await knex.with('vaults',
      knex(Tables.VaultLog)
        .select('address', 'id')
        .distinctOn('address')
        .orderBy(['address', { column: 'id', order: 'desc' }])
    ).select(selectedFields.map(f => `${Tables.VaultLog}.${f}`))
    .from('vaults')
    .where('is_active', true)
    .andWhereRaw(`west_amount / east_amount * ? < ?`, [ coef, LIQUIDATION_COLLATERAL ])
    .leftJoin(Tables.VaultLog, `vaults.id`, `${Tables.VaultLog}.id`)

    if (liquidatedVaults.length) {
      Logger.warn(`liquidatedVaults: ${liquidatedVaults.map(v => JSON.stringify(v)).join('\n')}`)
      Logger.warn(`westRate: ${JSON.stringify(westRate)}`)
      await Promise.all(liquidatedVaults.map(v =>
        this.liquidateVault(v).catch(err => {
          Logger.error(`Error while liquidating vault: ${JSON.stringify(v)}`)
          Logger.error(err)
        })
      ))
    }
  }

  async liquidateVault(vault: any) {
    const liquidateCall = this.weSdk.API.Transactions.CallContract.V4({
      contractId: this.configService.envs.EAST_CONTRACT_ID,
      contractVersion: 1,
      timestamp: Date.now(),
      params: [{
        type: 'string',
        key: 'liquidate',
        value: JSON.stringify({ address: vault.address})
      }]
    })

    await liquidateCall.broadcastGrpc(this.configService.getKeyPair())
  }
}
