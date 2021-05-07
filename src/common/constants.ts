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
  recalculate = 'recalculate',
  supply = 'supply',
  transfer = 'transfer',
  burn_init = 'burn_init',
  burn = 'burn',
  liquidate = 'liquidate',
}

export enum StateKeys {
  totalSupply = 'total_supply',
  balance = 'balance',
  vault = 'vault',
  config = 'config',
  exchange = 'exchange'
}

export interface ContractConfigParam {
  oracleContractId: string,
  oracleTimestampMaxDiff: number,
  usdpPart: number,
  westCollateral: number,
  liquidationCollateral: number,
  minHoldTime: number,
  adminAddress: string,
  adminPublicKey: string
}

export enum TxTypes {
  Issue = 'mint',
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
  westRateTimestamp: number,
  usdpRateTimestamp: number,
  liquidated?: boolean
}

export interface BurnParam {
  vaultId: string,
}

export interface LiquidateParam {
  vaultId: string,
}

export interface TransferParam {
  to: string,
  eastAmount: number
}

export interface MintParam {
  transferId: string,
}

export interface SupplyParam {
  transferId: string,
  vaultId: string
}

export type RecalculateParam = {
  vaultId: string
}