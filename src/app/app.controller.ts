import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiOkResponse } from '@nestjs/swagger'
import { ConfigService } from '../config/config.service'

@ApiTags('service')
@Controller()
export class AppController {
  constructor (
    private readonly configService: ConfigService,
  ) {}

  @Get('livenessProbe')
  @ApiResponse({
    status: 200,
    description: 'Liveness probe endpoint',
  })
  livenessProbe() {
    return { time: Date.now() }
  }

  @Get('readinessProbe')
  @ApiResponse({
    status: 200,
    description: 'Readiness probe endpoint',
  })
  readinessProbe() {
    return { time: Date.now() }
  }

  @Get('/config')
  @ApiOperation({
    summary: 'Get service config',
  })
  @ApiOkResponse({ type: String })
  config() {
    return {
      eastContractId: this.configService.getEastContractId()
    }
  }
}
