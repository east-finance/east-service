import * as grpc from '@grpc/grpc-js'
import { WeSdk } from '@wavesenterprise/js-sdk';
import { ContractStatusServiceClient } from '@wavesenterprise/js-sdk/raw/src/grpc/compiled-node/util/util_contract_status_service_grpc_pb'
import { ContractExecutionRequest, ContractExecutionResponse } from '@wavesenterprise/js-sdk/raw/src/grpc/compiled-node/util/util_contract_status_service_pb';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { ContractExecutionStatuses, DB_CON_TOKEN, Tables, WE_SDK_PROVIDER_TOKEN } from '../common/constants';
import { Knex } from 'knex';
import { getOAuthTokens } from '../common/oauth';

const PENDING_CALLS_LIMIT = 30;
const SECONDS_POLL_INTERVAL = 30;
const PENDING_CALLS_LOWER_LIMIT_IN_MINUTES = 10;
const ACCESS_TOKEN_UPDATE_INTERVAL = 15 * 1000;

@Injectable()
export class ContracExecutiontStatusService implements OnModuleInit {
  contractStatusServiceClient: ContractStatusServiceClient
  accessToken: string
  accessTokenLastUpdateTimestamp: number

  constructor(
    private readonly config: ConfigService,
    @Inject(WE_SDK_PROVIDER_TOKEN) private readonly weSdk: WeSdk,
    @Inject(DB_CON_TOKEN) readonly knex: Knex,
  ) { }

  async onModuleInit() {
    this.contractStatusServiceClient = await this.createContractStatusServiceClient();

    const updateStatuses = async () => {
      try {
        const pendingCalls = await this.getPendingCalls()
        const metadata = await this.getContractStatusRequestMetadata()
        const promises = pendingCalls.map(call => {
          return new Promise((resolve) => {
            return this.getContractExecutionStatus(call.txId, metadata, resolve)
          })
        })
        const statuses: any[] = await Promise.all(promises)
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i< statuses.length; i++) {
          const statusResponse = statuses[i]
          let contractStatus
          let error
          switch (statusResponse.status) {
            case 0:
              contractStatus = ContractExecutionStatuses.Success
              break
            case 1:
              contractStatus = ContractExecutionStatuses.Fail
              error = statusResponse.message
              break
            case 2:
              contractStatus = ContractExecutionStatuses.Fail
              error = statusResponse.message
              break
            default:
              contractStatus = ContractExecutionStatuses.Fail
              break
          }
          await this.updateStatus(statusResponse.txId as string, contractStatus, error)
        }
      } catch (e) {
        Logger.log(`Error on processing tx statuses: '${e.message}'`)
      }
    }

    updateStatuses()

    setInterval(updateStatuses, 1000 * SECONDS_POLL_INTERVAL)
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

  private updateStatus(txId: string, status: ContractExecutionStatuses, error?: string): Promise<number> {
      return this.knex(Tables.UserTransactionStatuses)
        .where('tx_id', '=', txId)
        .update({
          status,
          error,
        }) as Promise<number>
  }

  private getPendingCalls(): Promise<Array<{txId: string}>> {
    return this.knex(Tables.UserTransactionStatuses)
      .select({
        txId: `${Tables.UserTransactionStatuses}.tx_id`
      })
      .where({
        status: ContractExecutionStatuses.Pending
      })
      .andWhere('timestamp', '>', (new Date(Date.now() - 1000 * 60 * PENDING_CALLS_LOWER_LIMIT_IN_MINUTES)).toISOString())
      .limit(PENDING_CALLS_LIMIT)
  }

  private async getContractStatusRequestMetadata () {
    const metadata = new grpc.Metadata()
    if (this.config.envs.NODE_API_KEY) {
      metadata.add('X-API-Key', this.config.envs.NODE_API_KEY)
    } else if (this.config.envs.SERVICE_TOKEN) {
      if(!this.accessToken || (this.accessToken && (Date.now() - this.accessTokenLastUpdateTimestamp) > ACCESS_TOKEN_UPDATE_INTERVAL)) {
        const tokens = await getOAuthTokens(this.config.envs.AUTH_URL, this.config.envs.SERVICE_TOKEN)
        this.accessToken = tokens.access_token
        this.accessTokenLastUpdateTimestamp = Date.now()
      }
      metadata.add(`authorization`, `${this.accessToken}`)
    }
    return metadata
  }

  private getContractExecutionStatus(txId: string, metadata: any, resolve: any): any {
      try {
        const request = new ContractExecutionRequest()
        request.setTxId(this.weSdk.tools.base58.decode(txId))
        const connection = this.contractStatusServiceClient.contractExecutionStatuses(
          request,
          metadata
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
          Logger.log(`Get contract execution status from node: ${JSON.stringify(__data)}`)
          resolve(__data)
        });
        connection.on('close', () => {
          Logger.log('Connection stream closed');
        });
        connection.on('end', () => {
          Logger.log('Connection stream ended');
        });
        connection.on('error', (error) => {
          Logger.error(`Connection stream error: ${error.message}`);
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
      } catch (e) {
        Logger.error(`Cannot create txId '${txId}' status request: '${JSON.stringify(e)}'`)
      }
  }
}
