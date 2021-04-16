import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import {AuthUser, IAuthUser} from '../common/auth-user'
import { UserService } from './user.service'

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@ApiTags('user')
@Controller('v1/user')
export class UserController {
  constructor (
    private readonly userService: UserService,
  ) {}

  @Get('/init-order')
  async getMe(@AuthUser() user: IAuthUser) {
    return this.userService.initOrder(user)
  }
}
