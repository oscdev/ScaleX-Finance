'use strict';

const TABLES = [
  'zip_codes_to_lenders',
  'lender_business_exclusions',
  'cibil_report_summary',
  'lenders_criteria_pl',
  'advanced_lenders_criteria_pl',
];

const FK_CONSTRAINT = (table) => `${table}_lender_code_fk`;

module.exports = {
  async up(knex) {
    for (const table of TABLES) {
      const hasCol = await knex.schema.hasColumn(table, 'lender_code');
      if (!hasCol) {
        await knex.schema.alterTable(table, (t) => {
          t.string('lender_code').notNullable().defaultTo('');
        });
        await knex.schema.alterTable(table, (t) => {
          t.string('lender_code').notNullable().alter();
        });
      }

      // Enforce NOT NULL via raw (Strapi schema sync may leave it nullable)
      await knex.raw(`ALTER TABLE ?? ALTER COLUMN lender_code SET NOT NULL`, [table]);

      // Add FK if not already present
      const constraints = await knex.raw(
        `SELECT constraint_name FROM information_schema.table_constraints
         WHERE table_name = ? AND constraint_name = ? AND constraint_type = 'FOREIGN KEY'`,
        [table, FK_CONSTRAINT(table)]
      );
      if (constraints.rows.length === 0) {
        await knex.raw(
          `ALTER TABLE ?? ADD CONSTRAINT ?? FOREIGN KEY (lender_code)
           REFERENCES lenders_catalog(lender_code) ON UPDATE CASCADE`,
          [table, FK_CONSTRAINT(table)]
        );
      }
    }
  },

  async down(knex) {
    for (const table of TABLES) {
      const constraints = await knex.raw(
        `SELECT constraint_name FROM information_schema.table_constraints
         WHERE table_name = ? AND constraint_name = ? AND constraint_type = 'FOREIGN KEY'`,
        [table, FK_CONSTRAINT(table)]
      );
      if (constraints.rows.length > 0) {
        await knex.raw(`ALTER TABLE ?? DROP CONSTRAINT ??`, [table, FK_CONSTRAINT(table)]);
      }
      await knex.raw(`ALTER TABLE ?? ALTER COLUMN lender_code DROP NOT NULL`, [table]);
    }
  },
};
