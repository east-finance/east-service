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
  UserTransactionStatuses = 'user_transaction_statuses',
}

export enum StateKeys {
  totalSupply = 'total_supply',
  balance = 'balance',
  vault = 'vault',
  config = 'config',
  exchange = 'exchange',
  liquidatedVault = 'liquidated_vault',
  totalUsdap = 'total_usdap',
  liquidationExchange = 'liquidation_exchange',
}

export interface ContractConfigParam {
  oracleContractId: string,
  oracleTimestampMaxDiff: number,
  rwaPart: number,
  westCollateral: number,
  liquidationCollateral: number,
  minHoldTime: number,
  adminAddress: string,
  adminPublicKey: string
}

export enum TxTypes {
  mint = 'mint',
  reissue = 'reissue',
  supply = 'supply',
  transfer = 'transfer',
  close_init = 'close_init',
  close = 'close',
  liquidate = 'liquidate',
  update_config = 'update_config',
  claim_overpay_init = 'claim_overpay_init',
  claim_overpay = 'claim_overpay',
  write_liquidation_west_transfer = 'write_liquidation_west_transfer',
}

export enum TxStatuses {
  Init = 'init',
  Executed = 'executed',
  Declined = 'declined'
}

export enum ContractExecutionStatuses {
  Pending = 'pending',
  Success = 'success',
  Fail = 'fail',
}

export interface Oracle {
  value?: number,
  timestamp?: number
}

export interface OracleJson {
  value?: string,
  timestamp?: number
}

export interface Vault {
  eastAmount: number,
  westAmount: number,
  rwaAmount: number,
  westRate?: Oracle,
  rwaRate?: Oracle,
  liquidated?: boolean,
  isActive?: boolean,
  liquidatedWestAmount?: number,
}

export interface VaultJson {
  eastAmount: string,
  westAmount: string,
  rwaAmount: string,
  liquidatedWestAmount?: string,
  westRate: OracleJson,
  rwaRate: OracleJson,
  liquidated?: boolean,
  isActive?: boolean
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