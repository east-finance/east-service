import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity'

export enum ProfileType {
  Passport = 'passport'
}

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({nullable: true})
  middleName: string

  @Column({
    type: 'enum',
    enum: ProfileType,
    default: ProfileType.Passport
  })
  profileType: string

  @Column({ type: 'jsonb', nullable: false })
  data: object

  @CreateDateColumn({type: 'timestamptz'}) createdAt: Date
  @UpdateDateColumn({type: 'timestamptz'}) updatedAt: Date

  @ManyToOne(() => User, user => user.profiles)
  @JoinColumn()
  user: User
}
