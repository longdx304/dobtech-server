import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerPriceList1730186846658 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// add new column
		await queryRunner.query(`
			ALTER TABLE "price_list"
			ADD "customer_id" character varying
	`);

		// add foreign key
		await queryRunner.query(`
			ALTER TABLE "price_list"
			ADD CONSTRAINT "fk_price_list_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customer" ("id")
	`);

		// add index
		await queryRunner.query(`
			CREATE INDEX "idx_price_list_customer_id" ON "price_list" ("customer_id")
	`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// delete index
		await queryRunner.query(`DROP INDEX "idx_price_list_customer_id"`);

		// delete foreign key
		await queryRunner.query(
			`ALTER TABLE "price_list" DROP CONSTRAINT "fk_price_list_customer_id"`
		);

		// delete column
		await queryRunner.query(
			`ALTER TABLE "price_list" DROP COLUMN "customer_id"`
		);
	}
}
