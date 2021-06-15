# EAST service

## Архитектура

### База данных
Сущности транзакций, балансов, vaults и прочее хранятся не в виде сущностей а в виде журнала где на каждое изменение вставляется новая запись. Для того чтобы узнать актуальный баланс,транзакцию или значение vault нужно взять последнюю запись. При роллбеке удаляются только блоки, все записи в журналах удаляются автоматически через DELETE CASCADE получая при этом новое состояние для сущностей, таким образом отпадает необходимость вручную обрабатывать роллбэки.


## Переменные окружения:
  <b> app envs: </b>
  PORT - default: '3000'
  AUTH_URL - default: 'https://carter.welocal.dev/authServiceAddress'
  NODE_ADDRESS - default: 'https://carter.welocal.dev/node-0'
  NODE_GRPC_ADDRESSES - default: '51.178.69.5:6865'
  NODE_API_KEY - default: 'we'

  <b> posgres connection envs: </b>
  POSTGRES_USER - default: 'postgres'
  POSTGRES_PASSWORD - default: '123456'
  POSTGRES_DB - default: 'east_local'
  POSTGRES_PORT - default: '5432'
  POSTGRES_HOST - default: '127.0.0.1'
  PG_SSL_CERT_FILE_PATH

  
  <b>contract main envs:</b>
  Публичный и приватный ключ создателя контракта: 
  EAST_SERVICE_PUBLIC_KEY - default: '4qUrxWm53P3yCBikW96j8dNFBBxudbM3aaFfDPMUM8V1'
  EAST_SERVICE_PRIVATE_KEY - default: 'DRhyQvDKvaJeuMbhQR9gdyT8dMyoaHry23SifTNhN1qf'

  Id созданного контракта:
  EAST_CONTRACT_ID - default: 'GCgS6gagq2s3bEFaYq9nUSZV3nfV4cjQFpmxPCiNzuJH'

  Блок с которого начинается наблюдение - должен быть блоком создания контракта
  FIRST_BLOCK_SIGNATURE - default: '5dz...'

  Параметры конфига контракта (TODO брать его из блокчейна)
  USDAP_TOKEN_ID - default: '6Cc3dePRVFwn4VX6NZuwS2R9wDHU6z2eoKhZ7MdJ1fkR'
  ORACLE_CONTRACT_ID - default: 'Afnky7ZBdpXomouyFoCB59GFfWHHKd5rvapm8MyYn3dV'
  EAST_USDAP_PART - default: parseFloat(process.env.EAST_USDAP_PART) : 0.5
  EAST_WEST_COLLATERAL - default: 2.5
