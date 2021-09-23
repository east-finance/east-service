# EAST service

## Architecture

### Database
Transactions, balances, vaults are stored not as objects, but as journals, where a new entry is created for any change. You need to check the last entry to get the actual balance, vault value or the last transaction.

Rollback will delete only blocks, while all the journal entries delete automatically with DELETE CASCADE and get new object states, so you don't need to process rollbacks manually.


## ENV variables:

**NOTE: default values specified**

```dotenv
POSTGRES_USER=postgres
POSTGRES_PASSWORD=123456
POSTGRES_DB=east_local
POSTGRES_PORT=5432
POSTGRES_HOST=127.0.0.1
PG_SSL_CERT_FILE_PATH=

PORT=3000
# Auth service address
AUTH_URL=
# REST node address
NODE_ADDRESS=
# GRPC nodes addresses, for example: "51.178.69.5:6865"
NODE_GRPC_ADDRESSES=
NODE_API_KEY=
SERVICE_TOKEN=

# Waiting time for the transaction to get from the incoming microblock to the block, in seconds:
TX_LIFETIME=600

 # Public and private keys of EAST contract creator:   
EAST_SERVICE_PUBLIC_KEY=
EAST_SERVICE_PRIVATE_KEY=
# ID of created EAST contract:  
EAST_CONTRACT_ID=
# The block with which the observation begins - should be the block of contract creation  
FIRST_BLOCK_SIGNATURE=
# EAST contract version; By default = 1, should be increased after contract update
EAST_CONTRACT_VERSION=1

# EAST contract config params (TODO take it directly from Node)  
RWA_TOKEN_ID=
ORACLE_CONTRACT_ID=
EAST_USDAP_PART=0
EAST_WEST_COLLATERAL=2.5
LIQUIDATION_COLLATERAL=1.3

# Rate limiter settings
# By default: 120 request (THROTTLE_LIMIT) per 1 minute (60 seconds, THROTTLE_TTL) is permitted for 1 client
# NOTE: rate limiter in /service/* paths is disabled
THROTTLE_TTL=60
THROTTLE_LIMIT=120
```
