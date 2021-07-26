import { Module } from '@nestjs/common';
import { WeSdkFactory } from '../common/we-sdk.provider';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { ContracExecutiontStatusService } from './contract-execution-status.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [ContracExecutiontStatusService, WeSdkFactory],
})
export class ContracExecutiontStatusModule {}
