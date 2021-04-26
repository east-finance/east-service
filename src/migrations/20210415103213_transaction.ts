import { Knex } from "knex"


export async function up(knex: Knex): Promise<void> {
    return knex.raw(`
        CREATE TYPE tx_type AS ENUM ('issue', 'transfer', 'burn');
        CREATE TYPE tx_status AS ENUM ('init', 'executed');

        CREATE TABLE transactions_log (
            id               SERIAL                   PRIMARY KEY,
            tx_id            character varying        NOT NULL,
            status           tx_status                NOT NULL,
            type             tx_type                  NOT NULL,
            height           integer                  NOT NULL,
            request_tx_id    character varying,
            request_tx_timestamp timestamp with time zone,
            executed_tx_id    character varying,
            tx_timestamp     timestamp with time zone NOT NULL,
            created_at       timestamp with time zone NOT NULL,
            address          character varying        NOT NULL,
            info             jsonb,
            CONSTRAINT transactions_blocks FOREIGN KEY (height) REFERENCES blocks(height) ON DELETE CASCADE,
            UNIQUE(request_tx_id)
        );

        CREATE TABLE vault_log (
            id               integer                  PRIMARY KEY,
            vault_id         character varying        NOT NULL,
            address          character varying        NOT NULL,
            west_amount      numeric                  NOT NULL,
            east_amount      numeric                  NOT NULL,
            usdp_amount      numeric                  NOT NULL,
            CONSTRAINT vault_log_tx_id FOREIGN KEY (id) REFERENCES transactions_log(id) ON DELETE CASCADE
        );

        CREATE TABLE balance_log (
            id               integer                  PRIMARY KEY,
            address          character varying        NOT NULL,
            east_amount      numeric                  NOT NULL,
            CONSTRAINT balance_log_tx_id FOREIGN KEY (id) REFERENCES transactions_log(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS transactions_log_address ON public.transactions_log USING btree (height, created_at);
        CREATE INDEX IF NOT EXISTS transactions_log_order ON public.transactions_log USING btree (address);
        CREATE INDEX IF NOT EXISTS balance_log_address ON public.balance_log USING btree (address);
        CREATE INDEX IF NOT EXISTS tvault_log_address ON public.vault_log USING btree (address);
    `)
}


export async function down(knex: Knex): Promise<void> {}

