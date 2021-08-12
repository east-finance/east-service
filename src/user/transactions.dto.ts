import { ApiProperty } from '@nestjs/swagger'
import { ContractExecutionStatuses, TxStatuses, TxTypes } from '../common/constants'

export enum OracleStreams {
  USDAP = '000010_latest',
  WEST = '000003_latest'
}

export enum TransactionsTypes {
  Issue = 'issue',
  Transfer = 'transfer',
  Burn = 'burn',
}

export class AddressQuery {
  @ApiProperty({ required: true })
  address: string
}


export class OraclesQuery {
  @ApiProperty({ enum: OracleStreams })
  streamId: string

  @ApiProperty({ required: false })
  dateFrom?: number

  @ApiProperty({ required: false })
  dateTo?: number

  @ApiProperty({ required: false })
  limit?: number
}


export class TransactionsQuery {
  @ApiProperty({ required: true })
  address: string

  @ApiProperty({ default: 10, required: false })
  limit: number

  @ApiProperty({ default: 0, required: false })
  offset?: number
}

export class Transaction {

  @ApiProperty({ type: String })
  callTxId: string

  @ApiProperty({ type: String })
  address: string

  @ApiProperty({ enum: TxStatuses })
  status: string

  @ApiProperty({ type: String, required: false })
  requestTxId: string

  @ApiProperty({ type: Number, required: false })
  initHeight?: number

  @ApiProperty({ type: Number, required: false })
  executedHeight?: number

  @ApiProperty({ type: Number })
  callHeight?: number

  @ApiProperty({ type: String })
  callTimestamp?: string

  @ApiProperty({ enum: TransactionsTypes })
  transactionType: string

  @ApiProperty({ type: Number })
  westAmountDiff: number

  @ApiProperty({ type: Number })
  eastAmountDiff: number

  @ApiProperty({ type: Number })
  rwaAmountDiff: number

  @ApiProperty({ type: Object })
  info: object
}

export class Vault {

  @ApiProperty({ type: Number })
  id: number

  @ApiProperty({ type: String })
  address: string

  @ApiProperty({ type: String })
  vaultId: string

  @ApiProperty({ type: Number })
  westAmount: number

  @ApiProperty({ type: Number })
  eastAmount: number

  @ApiProperty({ type: Number })
  rwaAmount: number

  @ApiProperty({ type: Number })
  westRate: number

  @ApiProperty({ type: Number })
  rwaRate: number

  @ApiProperty({ type: Date })
  rwaRateTimestamp: Date

  @ApiProperty({ type: Date })
  westRateTimestamp: Date

  @ApiProperty({ type: Boolean })
  isActive: boolean

  @ApiProperty({ type: String })
  createdAt: string
}

export class Balance {

  @ApiProperty({ type: Number })
  id: number

  @ApiProperty({ type: String })
  address: string

  @ApiProperty({ type: Number })
  eastAmount: number

  @ApiProperty({ type: Number })
  eastAmountDiff: number

  @ApiProperty({ enum: TransactionsTypes })
  type: string
}

export class UserContractCallTxRequest {
  @ApiProperty({ type: String, required: true })
  txId: string

  @ApiProperty({ type: String, required: true })
  address: string

  @ApiProperty({ enum: TxTypes })
  type: TxTypes

  @ApiProperty({ type: Number, required: true })
  timestamp: number
}

export class UserContractCallTxResponse {
  @ApiProperty({ type: String, required: true })
  id: string

  @ApiProperty({ type: String, required: true })
  tx_id: string

  @ApiProperty({ type: String, required: true })
  address: string

  @ApiProperty({ enum: ContractExecutionStatuses })
  status: string

  @ApiProperty({ enum: TxTypes })
  type: string

  @ApiProperty({ type: String, required: true })
  error: string
}
