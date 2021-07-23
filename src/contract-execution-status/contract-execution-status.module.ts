import { Module } from '@nestjs/common';
import { WeSdkFactory } from '../common/we-sdk.provider';
import { ConfigModule } from '../config/config.module';
import { ContracExecutiontStatusService } from './contract-execution-status.service';

@Module({
  imports: [ConfigModule],
  providers: [ContracExecutiontStatusService, WeSdkFactory],
})
export class ContracExecutiontStatusModule {}
