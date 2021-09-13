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
  NODE_API_KEY  
  SERVICE_TOKEN

  Время ожидания попадания транзакции из пришедшего микроблока в блок, в секундах

  TX_LIFETIME - default: 600

  <b> posgres connection envs: </b>  
  POSTGRES_USER - default: 'postgres'  
  POSTGRES_PASSWORD - default: '123456'  
  POSTGRES_DB - default: 'east_local'  
  POSTGRES_PORT - default: '5432'  
  POSTGRES_HOST - default: '127.0.0.1'  
  PG_SSL_CERT_FILE_PATH  

  
  <b>contract main envs:</b>  
  Публичный и приватный ключ создателя контракта:   
  EAST_SERVICE_PUBLIC_KEY - default: ''  
  EAST_SERVICE_PRIVATE_KEY - default: ''  

  Id созданного контракта:  
  EAST_CONTRACT_ID - default: ''  
  EAST_CONTRACT_VERSION - default: '1'

  Блок с которого начинается наблюдение - должен быть блоком создания контракта  
  FIRST_BLOCK_SIGNATURE - default: ''  

  Параметры конфига контракта (TODO брать его из блокчейна)  
  RWA_TOKEN_ID - default: ''  
  ORACLE_CONTRACT_ID - default: ''  
  EAST_USDAP_PART - default: 0
  EAST_WEST_COLLATERAL - default: 2.5  
  LIQUIDATION_COLLATERAL - default: 1.3  
