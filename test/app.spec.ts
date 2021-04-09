import { HttpModule, INestApplication } from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'
import { AppController } from '../src/app/app.controller'
import { ConfigService } from '../src/config/config.service'
import { DeponentModule } from '../src/deponent/deponent.module'
import { createDb, dropDb } from './helper'

/*
import * as request from 'supertest'

const credentials = {
  username: 'some@admin_ema.il',
  password: 'some_strong_password'
}
*/
const DB_NAME = 'east_test_db'

describe('AppController', () => {
  let app: INestApplication
  let configService: ConfigService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, DeponentModule],
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService(DB_NAME),
        }
      ]
    }).compile()

    configService = moduleFixture.get<ConfigService>(ConfigService)

    app = moduleFixture.createNestApplication()
    await app.init()
    await createDb(DB_NAME)
  })

  it('TODO', async done => {
    console.log(configService)
    // TODO
    done()
  })

  afterAll(async done => {
    await app.close()
    await dropDb(DB_NAME)
    done()
  })
})
