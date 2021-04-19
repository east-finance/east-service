import { Knex } from "knex"


export async function up(knex: Knex): Promise<void> {
    return knex.raw(`
        CREATE TYPE tx_type AS ENUM ('issue', 'transfer', 'burn');

        CREATE TABLE transactions (
            tx_id            character varying        NOT NULL PRIMARY KEY,
            height           integer                  NOT NULL,
            request_tx_id    character varying        NOT NULL,
            request_timestamp timestamp with time zone    NOT NULL,
            timestamp        timestamp with time zone NOT NULL,
            transaction_type tx_type                  NOT NULL,
            amount           numeric                  NOT NULL,
            address          character varying        NOT NULL,
            info             jsonb,
            CONSTRAINT transactions_blocks FOREIGN KEY (height) REFERENCES blocks(height) ON DELETE CASCADE,
            UNIQUE(request_tx_id)
        );

        CREATE TABLE executed_transactions (
            tx_id            character varying           NOT NULL PRIMARY KEY,
            address          character varying           NOT NULL,
            executed_tx_id   character varying           NOT NULL,
            height           integer                     NOT NULL,
            timestamp        timestamp with time zone    NOT NULL,
            call_timestamp     timestamp with time zone    NOT NULL,
            executed_timestamp timestamp with time zone  NOT NULL,
            CONSTRAINT executed_transactions_blocks FOREIGN KEY (height) REFERENCES blocks(height) ON DELETE CASCADE,
            CONSTRAINT transactions_tx_id FOREIGN KEY (tx_id) REFERENCES transactions(tx_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS transactions_address ON public.transactions USING btree (address);
        CREATE INDEX IF NOT EXISTS executed_transactions_address ON public.executed_transactions USING btree (address);
    `)
}


export async function down(knex: Knex): Promise<void> {}

