const { resolve } = require('path');

const migrations = {
  tableName: 'migrations',
  directory: resolve(__dirname, 'migrations'),
};

const pool = {
  min: 10,
  max: 40,
};

const connection = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '123456',
  database: process.env.POSTGRES_DB || 'east',
  port: process.env.POSTGRES_PORT || '5432',
  host: process.env.POSTGRES_HOST || '127.0.0.1',
};

const knexCfg = {
  pool,
  connection,
  migrations,
  client: 'pg',
};

module.exports = knexCfg;
