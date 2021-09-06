import { Logger } from '@nestjs/common'
import { config } from 'dotenv'
import { version } from '../../package.json'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

config()

const AUTH_URL = process.env.AUTH_URL || 'https://carter.welocal.dev/authServiceAddress'
let PUBLIC_KEY: string = ''
try {
  PUBLIC_KEY = execSync(`curl -s -k '${AUTH_URL}/v1/auth/publicKey'`).toString()
} catch (err) {
  Logger.log('Cant get public key from auth server', 'ConfigService')
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1)
  }
}

const envs = {
  PORT: process.env.PORT || '3000',
  POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '123456',
  POSTGRES_DB: process.env.POSTGRES_DB || 'east_local',
  POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
  POSTGRES_HOST: process.env.POSTGRES_HOST || '127.0.0.1',
  PG_SSL_CERT_FILE_PATH: process.env.PG_SSL_CERT_FILE_PATH,
  NODE_ADDRESS: process.env.NODE_ADDRESS || 'https://carter.welocal.dev/node-0',
  NODE_GRPC_ADDRESS: process.env.NODE_GRPC_ADDRESSES || '51.178.69.5:6865',
  NODE_API_KEY: process.env.NODE_API_KEY,
  EAST_SERVICE_PUBLIC_KEY: process.env.EAST_SERVICE_PUBLIC_KEY || '4qUrxWm53P3yCBikW96j8dNFBBxudbM3aaFfDPMUM8V1',
  EAST_SERVICE_PRIVATE_KEY: process.env.EAST_SERVICE_PRIVATE_KEY || 'DRhyQvDKvaJeuMbhQR9gdyT8dMyoaHry23SifTNhN1qf',

  // AUTH
  AUTH_URL,
  SERVICE_TOKEN: process.env.SERVICE_TOKEN,
  PUBLIC_KEY,

  // PROCESS ENVS:
  // если база пустая - подпись первого блока с которого начинать парсить блокчейн
  FIRST_BLOCK_SIGNATURE: process.env.FIRST_BLOCK_SIGNATURE || '5dCZbyj2uPEzo1ntY9kAR8mXJLAxSySyg7qdYM2Du5Ni6Rm4goxXz5sqV8QTe6N6oBPieHrpXUvKngDSxMURzPPg',
  // oracle contract id
  ORACLE_CONTRACT_ID: process.env.ORACLE_CONTRACT_ID as string || 'Hj49AiuzVAtagpPEys4EzVNf8zdqYR2TiZiyPkdcN8ay',
  // east contract id
  EAST_CONTRACT_ID: process.env.EAST_CONTRACT_ID as string || '3AHnR1YFYow2igQ8vsPjugK1Vkndg2LAHGYxV46npVb7',
  USDAP_TOKEN_ID: process.env.USDAP_TOKEN_ID as string || '6Cc3dePRVFwn4VX6NZuwS2R9wDHU6z2eoKhZ7MdJ1fkR',
  // oracle streams
  WEST_ORACLE_STREAM: '000003_latest',
  RWA_ORACLE_STREAM: '000010_latest',
  // east collateral
  EAST_USDAP_PART: process.env.EAST_USDAP_PART ? parseFloat(process.env.EAST_USDAP_PART) : 0,
  EAST_WEST_COLLATERAL: process.env.EAST_WEST_COLLATERAL ? parseFloat(process.env.EAST_WEST_COLLATERAL) : 2.5,
  LIQUIDATION_COLLATERAL: process.env.LIQUIDATION_COLLATERAL ? parseFloat(process.env.LIQUIDATION_COLLATERAL) : 1.3,

  LIQUIDATION_CHECK_INTERVAL: process.env.LIQUIDATION_CHECK_INTERVAL ? parseInt(process.env.LIQUIDATION_CHECK_INTERVAL) : 1000 * 60 * 5,
  TX_LIFETIME: process.env.TX_LIFETIME ? Number(process.env.TX_LIFETIME) : 600,
}

export class ConfigService {
  readonly envs: typeof envs
  readonly dbName: string
  readonly publicKey: string = PUBLIC_KEY

  constructor (dbName?: string) {
    if (dbName) {
      this.dbName = dbName
    }
    this.envs = {
      ...envs,
    }
  }

  getAuthOptions() {
    if (!this.envs.NODE_API_KEY && !this.envs.SERVICE_TOKEN) {
      throw new Error(`Required env NODE_API_KEY or SERVICE_TOKEN are missing`)
    }

    return this.envs.NODE_API_KEY ? {
      nodeApiKey: this.envs.NODE_API_KEY
    } : {
      serviceToken: this.envs.SERVICE_TOKEN as string,
      authServiceAddress: this.envs.AUTH_URL
    }
  }

  getGrpcAddresses() {
    return envs.NODE_GRPC_ADDRESS.split(',')
  }

  getPort () {
    return Number(this.envs.PORT)
  }

  getJwtOptions () {
    return {
      publicKey: this.publicKey
    }
  }

  getPgOptions () {
    let ssl: { ca: string } | boolean = false
    if (this.envs.PG_SSL_CERT_FILE_PATH) {
      const ca = readFileSync(this.envs.PG_SSL_CERT_FILE_PATH).toString()
      ssl = {
        ca,
      }
    }
    return {
      host: this.envs.POSTGRES_HOST,
      port: Number(this.envs.POSTGRES_PORT),
      user: this.envs.POSTGRES_USER,
      password: this.envs.POSTGRES_PASSWORD,
      database: this.dbName || this.envs.POSTGRES_DB,
      ssl,
    }
  }

  isMailerEnabled () {
    return process.env.IS_MAIL_TRANSPORT_ENABLED === 'true'
  }

  getVersionInfo () {
    return {
      version,
    }
  }

  getKeyPair() {
    return {
      publicKey: this.envs.EAST_SERVICE_PUBLIC_KEY,
      privateKey: this.envs.EAST_SERVICE_PRIVATE_KEY
    }
  }

  getTxLifetime () {
    return this.envs.TX_LIFETIME
  }

  getEastContractId () {
    return this.envs.EAST_CONTRACT_ID
  }
}
