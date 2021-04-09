import { Controller, Get } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'

@Controller()
export class AppController {

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
}
