import {INestApplication} from '@nestjs/common'
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger'
import { getFromContainer, MetadataStorage } from 'class-validator'
import { validationMetadatasToSchemas } from 'class-validator-jsonschema'

export function setupSwagger(
  app: INestApplication,
  basePath: string,
  isDev: boolean,
  versionInfo: { version: string },
) {
  const options = new DocumentBuilder()
    .setTitle('Waves Enterprise deponent service')
    .setDescription('Deponent service API')
    .setVersion(versionInfo.version)
    .addServer(`http://`)
    .addServer(`https://`)
    .setBasePath(basePath)
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, options)

  const metadata = (getFromContainer(MetadataStorage) as any).validationMetadatas
  document.components!.schemas = {
    ...(document.components!.schemas || {}),
    ...validationMetadatasToSchemas(metadata),
  }

  SwaggerModule.setup('/docs', app, document)
}
