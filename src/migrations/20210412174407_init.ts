import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.raw(`
        CREATE TYPE oracle_stream_id AS ENUM ('000010_latest', '000003_latest');

        CREATE TABLE blocks (
            height         integer                     NOT NULL PRIMARY KEY,
            timestamp      timestamp with time zone    NOT NULL,
            generator      character varying           NOT NULL,
            signature      character varying           NOT NULL
        );

        CREATE TABLE oracles (
            tx_id          character varying           NOT NULL,
            height         integer                     NOT NULL,
            stream_id      oracle_stream_id            NOT NULL,
            timestamp      timestamp with time zone    NOT NULL,
            tx_timestamp   timestamp with time zone    NOT NULL,
            executed_timestamp timestamp with time zone    NOT NULL,
            value          numeric                     NOT NULL,
            CONSTRAINT oracles_blocks FOREIGN KEY (height) REFERENCES blocks(height) ON DELETE CASCADE,
            PRIMARY KEY (tx_id, stream_id)
        );

        CREATE INDEX IF NOT EXISTS oracles_timestamp ON public.oracles USING btree (stream_id, timestamp);
    `)
}


export async function down(knex: Knex): Promise<void> {
}

