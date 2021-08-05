import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import {
  DB_CON_TOKEN,
  Tables,
} from '../common/constants'
import { Knex } from 'knex'
import { PersistService } from './persist.service'


@Injectable()
export class LiquidationService {

  constructor (
    private readonly configService: ConfigService,
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
    private readonly persistService: PersistService
  ) {}

  async getLiquidatableVaults () {
    const { EAST_USDAP_PART, LIQUIDATION_COLLATERAL } = this.configService.envs
    const westPart = 1 - EAST_USDAP_PART
    const { westRate } = await this.persistService.getLastOracles()
    const coef = westRate.value / westPart

    return this.knex.with('vaults',
      this.knex(Tables.VaultLog)
        .select('address', 'id')
        .distinctOn('address')
        .orderBy(['address', { column: 'id', order: 'desc' }])
    ).select('*')
      .from('vaults')
      .where('is_active', true)
      .andWhereRaw(`west_amount / east_amount * ? < ?`, [ coef, LIQUIDATION_COLLATERAL ])
      .leftJoin(Tables.VaultLog, `vaults.id`, `${Tables.VaultLog}.id`)
  }
}
