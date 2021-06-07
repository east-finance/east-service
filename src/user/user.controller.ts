import { Controller, Get, UseGuards, Query } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import {AuthUser, IAuthUser} from '../common/auth-user'
import { UserService } from './user.service'
import { Vault, Transaction, TransactionsQuery } from './entities/Transactions'

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@ApiTags('user')
@Controller('v1/user')
export class UserController {
  constructor (
    private readonly userService: UserService,
  ) {}

  @Get('/transactions')
  @ApiOkResponse({ type: [Transaction] })
  async getTransactions(@AuthUser() user: IAuthUser, @Query() { address, limit, offset }: TransactionsQuery) {
    return this.userService.getTransactions(address, limit, offset)
  }

  @Get('/vault')
  @ApiOkResponse({ type: Vault })
  async getCurrentVault(@AuthUser() user: IAuthUser, @Query() { address }: TransactionsQuery) {
    return this.userService.getCurrentVault(address)
  }

  @Get('/vaults')
  @ApiOkResponse({ type: [Vault] })
  async getVaults(@AuthUser() user: IAuthUser, @Query() { address, limit, offset }: TransactionsQuery) {
    return this.userService.getVaults(address, limit, offset)
  }
}

