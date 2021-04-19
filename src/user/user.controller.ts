import { Controller, Get, UseGuards, Query } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import {AuthUser, IAuthUser} from '../common/auth-user'
import { UserService } from './user.service'
import { TransactionsResponseDto, TransactionsQuery } from './entities/Transactions'

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@ApiTags('user')
@Controller('v1/user')
export class UserController {
  constructor (
    private readonly userService: UserService,
  ) {}

  @Get('/transactions')
  @ApiOkResponse({ type: TransactionsResponseDto })
  async getMe(@AuthUser() user: IAuthUser, @Query() { address, limit, offset }: TransactionsQuery) {
    return this.userService.getTransactions(address, limit, offset)
  }
}

