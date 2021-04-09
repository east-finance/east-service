import { Logger } from '@nestjs/common'
import { config } from 'dotenv'
import { version } from '../../package.json'


let PUBLIC_KEY: string
try {
  PUBLIC_KEY = '1234'
  // execSync(`curl -s -k '${AUTH_URL}/v1/auth/publicKey'`).toString()
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
  POSTGRES_DB: process.env.POSTGRES_DB || 'east',
  POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
  POSTGRES_HOST: process.env.POSTGRES_HOST || '127.0.0.1',
  SWAGGER_BASE_PATH: process.env.SWAGGER_BASE_PATH || '/docs',
  NODE_GRPC_ADDRESS: process.env.NODE_GRPC_ADDRESSES || '51.178.69.186:6865',
  NODE_PUBLIC_KEY: process.env.NODE_PUBLIC_KEY || 'AYgataydtcjocJvNKCkiUF8yHZ4dQ48HzMJKS9YAPJyv',
  NODE_PRIVATE_KEY: process.env.NODE_PRIVATE_KEY || '4GPuAPGTVpsACgUfqEJ7Fn8p4EpyKjUNoa79bTgmBpHF',
  NODE_API_KEY: process.env.NODE_API_KEY || 'vostok'
}

export class ConfigService {
  readonly envs: typeof envs
  readonly dbName: string
  readonly publicKey: string = PUBLIC_KEY

  constructor (dbName?: string) {
    config()
    if (dbName) {
      this.dbName = dbName
    }
    this.envs = {
      ...envs,
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
    return {
      host: this.envs.POSTGRES_HOST,
      port: Number(this.envs.POSTGRES_PORT),
      username: this.envs.POSTGRES_USER,
      password: this.envs.POSTGRES_PASSWORD,
      database: this.dbName || this.envs.POSTGRES_DB,
      ssl: process.env.POSTGRES_ENABLE_SSL === 'true',
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

  isDev () {
    return process.env.NODE_ENV !== 'production'
  }

  getKeyPair() {
    return {
      publicKey: this.envs.NODE_PUBLIC_KEY,
      privateKey: this.envs.NODE_PRIVATE_KEY
    }
  }
}
