import { ApiProperty } from '@nestjs/swagger'
import { TxStatuses } from '../../common/constants'

export enum TransactionsTypes {
  Issue = 'issue',
  Transfer = 'transfer',
  Burn = 'burn',
}

export class TransactionsQuery {
  @ApiProperty({required: true})
  address: string

  @ApiProperty({default: 10, required: false})
  limit: number

  @ApiProperty({default: 0, required: false})
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
  usdpAmount: number

  @ApiProperty({ type: Number })
  westRate: number

  @ApiProperty({ type: String })
  createdAt: string
}  