import { Knex } from "knex"


export async function up(knex: Knex): Promise<void> {
    return knex.raw(`
        CREATE TYPE tx_type AS ENUM ('mint', 'transfer', 'close', 'reissue', 'supply', 'close_init', 'liquidate', 'update_config', 'claim_overpay_init', 'claim_overpay');
        CREATE TYPE tx_status AS ENUM ('init', 'executed', 'declined');

        CREATE TABLE transactions_log (
            id               SERIAL                   PRIMARY KEY,
            tx_id            character varying        NOT NULL,
            address          character varying        NOT NULL,
            status           tx_status                NOT NULL,
            type             tx_type                  NOT NULL,
            height           integer                  NOT NULL,
            request_tx_id    character varying,
            request_tx_timestamp timestamp with time zone,
            request_params   jsonb,
            executed_tx_id   character varying,
            tx_timestamp     timestamp with time zone NOT NULL,
            created_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
            params           jsonb,
            CONSTRAINT transactions_blocks FOREIGN KEY (height) REFERENCES blocks(height) ON DELETE CASCADE,
            UNIQUE(request_tx_id),
            UNIQUE(tx_id, address, status)
        );

        CREATE TABLE vault_log (
            id               integer                  PRIMARY KEY,
            vault_id         character varying        NOT NULL,
            address          character varying        NOT NULL,
            is_active        boolean                  DEFAULT true NOT NULL,
            west_amount      numeric                  NOT NULL,
            east_amount      numeric                  NOT NULL,
            usdp_amount      numeric                  NOT NULL,
            west_amount_diff      numeric                  NOT NULL,
            east_amount_diff      numeric                  NOT NULL,
            usdp_amount_diff      numeric                  NOT NULL,
            west_rate        numeric,
            usdp_rate        numeric,
            west_rate_timestamp timestamp with time zone,
            usdp_rate_timestamp timestamp with time zone,
            created_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT vault_log_tx_id FOREIGN KEY (id) REFERENCES transactions_log(id) ON DELETE CASCADE
        );

        CREATE INDEX vault_log_address ON vault_log (address, id DESC);

        CREATE TABLE balance_log (
            id               integer                  PRIMARY KEY,
            address          character varying        NOT NULL,
            east_amount      numeric                  NOT NULL,
            east_amount_diff      numeric                  NOT NULL,
            type             tx_type                  NOT NULL,
            CONSTRAINT balance_log_tx_id FOREIGN KEY (id) REFERENCES transactions_log(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS balance_log_address ON public.balance_log USING btree (address);
        CREATE INDEX IF NOT EXISTS transactions_log_address ON public.transactions_log USING btree (height, created_at);
        CREATE INDEX IF NOT EXISTS transactions_log_order ON public.transactions_log USING btree (address);
        CREATE INDEX IF NOT EXISTS tvault_log_address ON public.vault_log USING btree (address);
    `)
}


export async function down(knex: Knex): Promise<void> {}

