# DEPONENT

### Envs:

POSTGRES_USER  
POSTGRES_PASSWORD  
POSTGRES_DB  
POSTGRES_PORT  
POSTGRES_HOST

PORT: process.env.PORT || '3000',
POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '123456',
POSTGRES_DB: process.env.POSTGRES_DB || 'deponent',
POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
POSTGRES_HOST: process.env.POSTGRES_HOST || '127.0.0.1',
AUTH_URL: process.env.AUTH_URL || 'http://127.0.0.1:3001',
SWAGGER_BASE_PATH: process.env.SWAGGER_BASE_PATH || '/docs',
MAIL_PORT: process.env.MAIL_PORT || '587',
MAIL_USER: process.env.MAIL_USER || 'some@ema.il',
MAIL_PASSWORD: process.env.MAIL_PASSWORD || 'some_strong_password',
MAIL_HOST: process.env.MAIL_HOST || 'mail.waves.work',
PAYMENT_PUBLIC_ID: process.env.PAYMENT_PUBLIC_ID || 'pk_59e080d79c5230975afed3cb4076d',
PAYMENT_API_SECRET: process.env.PAYMENT_API_SECRET || 'e0928c8da3b2ef8448f02ede1d7f39b3',
PAYMENT_API_URL: 'https://api.cloudpayments.ru',
DEPONENT_PRICE: process.env.DEPONENT_PRICE || 100,
S3_ID_KEY: process.env.S3_KEY_ID || 'AKIAJWXXK3NP3BM32OEA',
S3_SECRET_KEY: process.env.S3_SECRET_KEY || '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',
S3_BUCKET: process.env.S3_BUCKET?.trim() || 'deponent-test',
S3_URL_EXPIRATION: process.env.S3_URL_EXPIRATION || 60 \* 60, // in seconds
S3_REGION: process.env.S3_REGION || 'eu-central-1',
DEPONENT_SITE_URL: process.env.DEPONENT_SITE_URL || 'https://deponent.hoover.welocal.dev',
NODE_ADDRESS: process.env.NODE_ADDRESS || 'https://hoover.welocal.dev/nodeAddress',
NODE_PUBLIC_KEY: process.env.NODE_PUBLIC_KEY || 'AYgataydtcjocJvNKCkiUF8yHZ4dQ48HzMJKS9YAPJyv',
NODE_PRIVATE_KEY: process.env.NODE_PRIVATE_KEY || '4GPuAPGTVpsACgUfqEJ7Fn8p4EpyKjUNoa79bTgmBpHF',
FILE_REMOVE_TIMEOUT: process.env.FILE_REMOVE_TIMEOUT

IS_MAIL_TRANSPORT_ENABLED
IS_MAIL_SECURE
POSTGRES_ENABLE_SSL
