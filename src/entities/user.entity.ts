import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm'
import { Document } from './document.entity'
import { Order } from './orders.entity'
import { Profile } from './profile.entity'


export interface IUser {
  id?: string,
  login: string,
}

export interface IUserInfo {
  id: string,
  email: string,
  profile?: Profile
}

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'uuid', unique: true })
  id: string

  @Column({ name: 'email', unique: true })
  email: string

  @OneToMany(() => Profile, profile => profile.user)
  profiles: Profile[]

  @OneToMany(() => Document, doc => doc.owner)
  documents: Document[]

  @OneToMany(() => Order, order => order.buyer)
  purchases: Order[]

  @OneToMany(() => Order, order => order.seller)
  sales: Order[]
}
