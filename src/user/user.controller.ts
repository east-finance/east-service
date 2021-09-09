import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpException,
  Post,
  Body,
  UseInterceptors,
  ClassSerializerInterceptor, NotFoundException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import {AuthUser, IAuthUser} from '../common/auth-user'
import { UserService } from './user.service'
import { Vault, Transaction, TransactionsQuery, AddressQuery, OraclesQuery, UserContractCallTxRequest, UserContractCallTxResponse, Balance } from './transactions.dto'
import { HttpCacheInterceptor } from '../cache/http-cache.interceptor'
import { LiquidationService } from '../blockchain-listener/liquidation.service'
import { Await } from '../common/types'
import { roundNumber } from '../common/round-number'

const DECIMALS = 8;

const MULTIPLIER = Math.pow(10, DECIMALS);

function transformBalance(balanceResponse: Balance | Omit<Balance, 'eastAmount' | 'eastAmountDiff'> & { eastAmount: string, eastAmountDiff: string }) {
  balanceResponse.eastAmount = roundNumber(balanceResponse.eastAmount as unknown as number / MULTIPLIER);
  balanceResponse.eastAmountDiff = roundNumber(balanceResponse.eastAmountDiff  as unknown as number / MULTIPLIER);
  return balanceResponse
}

function transformTransactions(txs: Await<ReturnType<UserService['getTransactions']>>) {
  return txs.map(tx => {
    tx.westAmountDiff = roundNumber(tx.westAmountDiff / MULTIPLIER);
    tx.rwaAmountDiff = roundNumber(tx.rwaAmountDiff / MULTIPLIER);
    tx.eastAmountDiff = roundNumber(tx.eastAmountDiff / MULTIPLIER);
    return tx
  });
}

function transformVault(vault: Vault |
  Omit<Vault, 'eastAmount' | 'rwaAmount' | 'westAmount'> & {
    eastAmount: string,
    rwaAmount: string,
    westAmount: string,
  }
) {
  vault.eastAmount = roundNumber(vault.eastAmount as unknown as number / MULTIPLIER);
  vault.rwaAmount = roundNumber(vault.rwaAmount as unknown as number / MULTIPLIER);
  vault.westAmount = roundNumber(vault.westAmount as unknown as number / MULTIPLIER);
  return vault
}

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('user')
@Controller('v1/user')
export class UserController {
  constructor (
    private readonly userService: UserService,
    private readonly liquidationService: LiquidationService,
  ) {}

  @UseInterceptors(HttpCacheInterceptor)
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

    return this.userService.getOracles(streamId,
      dateFromParsed && new Date(dateFromParsed),
      dateToParsed && new Date(dateToParsed),
      limit
    )
  }

  @Get('/transactions')
  @ApiOkResponse({ type: [Transaction] })
  async getTransactions(@AuthUser() user: IAuthUser, @Query() { address, limit, offset }: TransactionsQuery) {
    return transformTransactions(await this.userService.getTransactions(address, limit, offset))
  }

  @Get('/transactions/statuses')
  @ApiOkResponse({ type: [UserContractCallTxResponse] })
  async getTransactionStatuses(@Query() { address, limit, offset }: TransactionsQuery) {
    return this.userService.getTransactionStatuses(address, limit, offset)
  }

  @Post('/transactions/statuses')
  async setUserContractCall(@Body() tx: UserContractCallTxRequest) {
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
    const vault = await this.userService.getCurrentVault(address)
    if (vault) {
      return transformVault(vault)
    }
    throw new NotFoundException('Vault is not found')
  }

  @Get('/liquidatableVaults')
  @ApiOkResponse({ type: [Vault] })
  async getLiquidateVaults() {
    return this.liquidationService.getLiquidatableVaults()
  }

  @Get('/balance')
  @ApiOkResponse({ type: Vault })
  async getCurrentBalance(@AuthUser() user: IAuthUser, @Query() { address }: AddressQuery) {
    return transformBalance((await this.userService.getCurrentBalance(address)))
  }


  @Get('/vaults')
  @ApiOkResponse({ type: [Vault] })
  async getVaults(@AuthUser() user: IAuthUser, @Query() { address, limit, offset }: TransactionsQuery) {
    return this.userService.getVaults(address, limit, offset)
  }
}
