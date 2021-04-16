import { Inject } from '@nestjs/common'
import { IAuthUser } from '../common/auth-user'
import { DB_CON_TOKEN } from '../common/constants'
import { Knex } from 'knex'


export class UserService {

  constructor (
    @Inject(DB_CON_TOKEN) readonly knex: Knex
  ) {}

  async initOrder (user: IAuthUser) {
    return user
  }
}
