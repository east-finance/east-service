import * as grpc from '@grpc/grpc-js'
import { WeSdk } from '@wavesenterprise/js-sdk';
import { ContractStatusServiceClient } from '@wavesenterprise/js-sdk/raw/src/grpc/compiled-node/util/util_contract_status_service_grpc_pb'
import { ContractExecutionRequest, ContractExecutionResponse } from '@wavesenterprise/js-sdk/raw/src/grpc/compiled-node/util/util_contract_status_service_pb';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { ContractExecutionStatuses, DB_CON_TOKEN, Tables, WE_SDK_PROVIDER_TOKEN } from '../common/constants';
import { from, Observable, timer } from 'rxjs';
import { Knex } from 'knex';
import { exhaustMap, mergeMap } from 'rxjs/operators';

const PENDING_CALLS_LIMIT = 100;

const SECONDS_POLL_INTERVAL = 30;

@Injectable()
export class ContracExecutiontStatusService implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk,
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
  ) { }

  contractStatusServiceClient: ContractStatusServiceClient

  async onModuleInit() {
    this.contractStatusServiceClient = await this.createContractStatusServiceClient();
    timer(0, 1000 * SECONDS_POLL_INTERVAL)
      .pipe(
        exhaustMap(
          _counter => this.getPendingCalls()
            .pipe(
              mergeMap(calls => from(calls)),
              mergeMap(call => this.getContractExecutionStatus(call.txId)),
              mergeMap(statusResponse => {
                let status, error
                switch (statusResponse.status) {
                  case 0:
                    status = ContractExecutionStatuses.Success
                    break;
                  case 1:
                    status = ContractExecutionStatuses.Fail
                    error = statusResponse.message;
                    break;
                  case 2:
                    status = ContractExecutionStatuses.Fail
                    error = statusResponse.message;
                    break;
                }            
                return this.updateStatus(statusResponse.txId as string, status, error)
              })
            )
        )
      )
      .subscribe()
  }

  private async createContractStatusServiceClient(): Promise<ContractStatusServiceClient> {
    return new Promise((resolve, reject) => {
      const contractStatusService = new ContractStatusServiceClient(
        this.config.getGrpcAddresses()[0],
        grpc.credentials.createInsecure(),
        {
          'grpc.keepalive_time_ms': 10000,
          'grpc.keepalive_timeout_ms': 5000,
          'grpc.keepalive_permit_without_calls': 1,
          'grpc.http2.max_pings_without_data': 0,
          'grpc.http2.min_time_between_pings_ms': 10000,
          'grpc.http2.min_ping_interval_without_data_ms': 5000,
          'grpc.max_receive_message_length': 1024 * 1024 * 64,
        },
      )
      contractStatusService.waitForReady(Date.now() + 1000 * 60, (err) => {
        if (err) {
          reject(err)
        }
        resolve(contractStatusService)
      })
    })
  }

  private updateStatus(txId: string, status: ContractExecutionStatuses, error?: string): Observable<number> {
    return from(
      this.knex(Tables.UserTransactionStatuses)
        .where('tx_id', '=', txId)
        .update({
          status,
          error,
        }) as Promise<number>
    )
  }

  private getPendingCalls(): Observable<{ txId: string }[]> {
    return from(
      this.knex(Tables.UserTransactionStatuses)
        .select({
          txId: `${Tables.UserTransactionStatuses}.tx_id`
        })
        .where({
          status: ContractExecutionStatuses.Pending
        })
        .limit(PENDING_CALLS_LIMIT)
    )
  }

  private getContractExecutionStatus(txId: string): Observable<ContractExecutionResponse.AsObject> {
    return new Observable(subscriber => {
      const request = new ContractExecutionRequest()
      request.setTxId(this.weSdk.tools.base58.decode(txId))
      const connection = this.contractStatusServiceClient.contractExecutionStatuses(
        request,
        new grpc.Metadata(),
      )
      connection.on('data', (data: ContractExecutionResponse) => {
        const _data = data.toObject()
        const __data = {
          message: _data.message,
          status: _data.status,
          timestamp: _data.timestamp,          
          sender: this.weSdk.tools.base58.encode(data.getSender_asU8()),
          signature: this.weSdk.tools.base58.encode(data.getSignature_asU8()),
          txId: this.weSdk.tools.base58.encode(data.getTxId_asU8()),
        }
        subscriber.next(__data)
        subscriber.complete()
        Logger.log(`Get contract execution status from node: ${JSON.stringify(__data)}`)
      });
      connection.on('close', () => {
        Logger.log('Connection stream closed');
      });
      connection.on('end', () => {
        Logger.log('Connection stream ended');
      });
      connection.on('error', (error) => {
        Logger.error(`Connection stream error: ${error.message}`);
        subscriber.complete()
      });
      connection.on('readable', () => {
        Logger.log('Connection stream readable');
        connection.read();
      });
      connection.on('pause', () => {
        Logger.log('Connection stream paused');
      });
      connection.on('resume', () => {
        Logger.log('Connection stream resumed');
      });
      Logger.log('Connection created');
    })
  }
}
