import {INestApplication} from '@nestjs/common'
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger'
import { getFromContainer, MetadataStorage } from 'class-validator'
import { validationMetadatasToSchemas } from 'class-validator-jsonschema'

export function setupSwagger(
  app: INestApplication,
  versionInfo: { version: string },
) {
  const options = new DocumentBuilder()
    .setTitle('Waves Enterprise east service')
    .setDescription('Waves Enterprise service API')
    .setVersion(versionInfo.version)
    .addServer(`http://`)
    .addServer(`https://`)
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, options)

  const metadata = (getFromContainer(MetadataStorage) as any).validationMetadatas
  document.components!.schemas = {
    ...(document.components!.schemas || {}),
    ...validationMetadatasToSchemas(metadata),
  }

  SwaggerModule.setup('/', app, document)
}
