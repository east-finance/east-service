import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { User, Document } from '.'

export enum OrderStatus {
  Pending = 'pending',
  Declined = 'declined',
  Approved = 'approved',
  Paid = 'paid',
  Completed = 'completed'
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, user => user.id, { eager: true })
  @JoinColumn()
  seller: User

  @ManyToOne(() => User, user => user.id, { eager: true })
  @JoinColumn()
  buyer: User

  @OneToOne(() => Document, doc => doc.id, { eager: true })
  @JoinColumn()
  document: Document

  @Column({ nullable: false })
  buyerEmail: string

  @Column({ nullable: false })
  price: number

  @Column({ nullable: true })
  comment: string

  @Column({ nullable: true })
  transactionId: string

  @Column({ nullable: true })
  blockchainTxId: string

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.Pending
  })
  status: OrderStatus

  @CreateDateColumn({type: 'timestamptz'}) createdAt: Date
  @UpdateDateColumn({type: 'timestamptz'}) updatedAt: Date
}
