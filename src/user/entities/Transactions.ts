import { ApiProperty } from '@nestjs/swagger'

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

export class Transactions {
  @ApiProperty({ type: String })
  requestTxId: string

  @ApiProperty({ type: String })
  callTxId: string

  @ApiProperty({ type: String })
  address: string

  @ApiProperty({ type: Number })
  requestHeight: number

  @ApiProperty({ type: Number, required: false })
  callHeight?: number

  @ApiProperty({ type: String, required: false })
  callTimestamp?: string

  @ApiProperty({ type: Number })
  amount: number

  @ApiProperty({ enum: TransactionsTypes })
  transactionType: string

  @ApiProperty({ type: String })
  info: string
}
  
export class TransactionsResponseDto {
  @ApiProperty()
  totalAmount: string

  @ApiProperty({ type: String })
  address: string

  @ApiProperty({ type: [Transactions] })
  transactions: object[]
}
  