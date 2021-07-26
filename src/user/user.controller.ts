import { Controller, Get, UseGuards, Query, HttpException, Post, Body } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import {AuthUser, IAuthUser} from '../common/auth-user'
import { UserService } from './user.service'
import { Vault, Transaction, TransactionsQuery, AddressQuery, OraclesQuery, UserContractCallTxRequest, UserContractCallTxResponse } from './transactions.dto'

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@ApiTags('user')
@Controller('v1/user')
export class UserController {
  constructor (
    private readonly userService: UserService,
  ) {}

  @Get('/oracles')
  @ApiOkResponse({ type: [Transaction] })
  async getOracles(@AuthUser() user: IAuthUser, @Query() { streamId, limit, dateFrom, dateTo }: OraclesQuery) {
    let dateFromParsed = dateFrom && Number(dateFrom) as any
    let dateToParsed = dateTo && Number(dateTo) as any
    const offset = 24 * 60 * 60 * 1000

    if (!limit) {
      if (!dateFromParsed) {
        dateToParsed = dateToParsed || Date.now()
        dateFromParsed = dateToParsed - offset
      } else if (!dateToParsed || dateToParsed - dateFromParsed > offset) {
        dateToParsed = dateFromParsed + offset
      }
    }

    if (!['000010_latest', '000003_latest'].includes(streamId)) {
      throw new HttpException(`No such stream id: ${streamId}. Allowed: '000010_latest', '000003_latest'`, 400)
    }
    return this.userService.getOracles(streamId, dateFromParsed && new Date(dateFromParsed), dateToParsed && new Date(dateToParsed), limit)
  }

  @Get('/transactions')
  @ApiOkResponse({ type: [Transaction] })
  async getTransactions(@AuthUser() user: IAuthUser, @Query() { address, limit, offset }: TransactionsQuery) {
    return this.userService.getTransactions(address, limit, offset)
  }

  @Get('/transactions/statuses')
  @ApiOkResponse({ type: [UserContractCallTxResponse] })
  async getTransactionStatuses(@AuthUser() user: IAuthUser, @Query() { address, limit, offset }: TransactionsQuery) {
    return this.userService.getTransactionStatuses(address, limit, offset)
  }

  @Post('/transactions/statuses')
  async setUserContractCall(@AuthUser() user: IAuthUser, @Body() tx: UserContractCallTxRequest) {
    try {
      await this.userService.setUserContractCall(tx)
      return { status: 'success' }
    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message }
      }
      return { error: 'Unknown error' }
    }
  }

  @Get('/vault')
  @ApiOkResponse({ type: Vault })
  async getCurrentVault(@AuthUser() user: IAuthUser, @Query() { address }: AddressQuery) {
    return this.userService.getCurrentVault(address)
  }

  @Get('/balance')
  @ApiOkResponse({ type: Vault })
  async getCurrentBalance(@AuthUser() user: IAuthUser, @Query() { address }: AddressQuery) {
    return this.userService.getCurrentBalance(address)
  }


  @Get('/vaults')
  @ApiOkResponse({ type: [Vault] })
  async getVaults(@AuthUser() user: IAuthUser, @Query() { address, limit, offset }: TransactionsQuery) {
    return this.userService.getVaults(address, limit, offset)
  }
}
