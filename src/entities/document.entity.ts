import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Profile } from './profile.entity'
import { User } from './user.entity'

export enum DocStatus {
  Created = 'created',
  Init = 'init',
  Filled = 'filled',
  Paid = 'paid',
  InitOrder = 'init-order',
  Sold = 'sold',
  Deleted = 'deleted'
}

export enum DocType {
  Image = 'image',
  Media = 'media',
  Document = 'document' // text, pdf, word, etc.
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({nullable: false})
  name: string

  @Column({ nullable: true })
  location: string

  @Column({nullable: true})
  description: string

  @Index({ unique: true })
  @Column({ nullable: true })
  hash: string

  @Index({ unique: true })
  @Column({ nullable: true, select: false })
  transactionId?: string

  @Column({ type: 'jsonb', nullable: true })
  fileInfo: object

  @Column({ nullable: true })
  blockchainTxId: string

  @Column({
    type: 'enum',
    enum: DocType,
    nullable: true
  })
  type: DocType

  @Column({
    type: 'enum',
    enum: DocStatus,
    default: DocStatus.Created
  })
  status: DocStatus

  @CreateDateColumn({type: 'timestamptz'}) createdAt: Date
  @UpdateDateColumn({type: 'timestamptz'}) updatedAt: Date

  @ManyToOne(() => User, user => user.documents, {eager: true})
  @JoinColumn()
  owner: User

  @ManyToOne(() => Profile, profile => profile.user)
  @JoinColumn()
  profile?: Profile
}
