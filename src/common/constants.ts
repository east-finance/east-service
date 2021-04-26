export const DB_CON_TOKEN = 'DbConnectionToken'
export const WE_SDK_PROVIDER_TOKEN = 'WE_SDK_PROVIDER_TOKEN'
export const USER_REPOSITORY_TOKEN = 'USER_REPOSITORY_TOKEN'
export const PROFILE_REPOSITORY_TOKEN = 'PROFILE_REPOSITORY_TOKEN'
export const ORDER_REPOSITORY_TOKEN = 'ORDER_REPOSITORY_TOKEN'

export enum Tables {
  Blocks = 'blocks',
  Oracles = 'oracles',
  VaultLog = 'vault_log',
  TransactionsLog = 'transactions_log',
  BalanceLog = 'balance_log',
}

export enum Operations {
  mint = 'mint',
  transfer = 'transfer',
  burn = 'burn',
  recalculate_init = 'recalculate_init',
  recalculate_execute = 'recalculate_execute',
}

export enum StateKeys {
  adminPublicKey = 'admin_pub_key',
  totalSupply = 'total_supply',
  balance = 'balance',
  vault = 'vault'
}

export enum TxTypes {
  Issue = 'issue',
  Transfer = 'transfer',
  Burn = 'burn'
}

export enum TxStatuses {
  Init = 'init',
  Executed = 'executed'
}

export interface IVault {
  address: string,
  eastAmount: number,
  westAmount: number,
  usdpAmount: number,
}