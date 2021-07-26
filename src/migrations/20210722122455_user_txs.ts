import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.raw(`
      CREATE TYPE contract_execution_status AS ENUM ('pending', 'success', 'fail');

      CREATE TABLE user_transaction_statuses (
        id               SERIAL                                   PRIMARY KEY,
        tx_id            character varying                        NOT NULL,
        address          character varying                        NOT NULL,
        status           contract_execution_status                NOT NULL,
        type             tx_type                                  NOT NULL,
        error            character varying,
        UNIQUE(tx_id, address, status)
      );

      CREATE INDEX user_transaction_statuses_address ON user_transaction_statuses (address);
      CREATE INDEX user_transaction_statuses_status ON user_transaction_statuses (status);
  `)
}


export async function down(knex: Knex): Promise<void> {
}
