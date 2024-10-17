import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSupplierOrderEntity1729118718972
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add new columns
		await queryRunner.query(
			`ALTER TABLE "supplier_order"
				ADD COLUMN "region_id" character varying NOT NULL,
				ADD COLUMN "currency_code" character varying NOT NULL`
		);

		// Add foreign key constraints
		await queryRunner.query(
			`ALTER TABLE "supplier_order"
				ADD CONSTRAINT "fk_supplier_order_region_id" FOREIGN KEY ("region_id") REFERENCES "region"("id")`
		);
		await queryRunner.query(
			`ALTER TABLE "supplier_order"
				ADD CONSTRAINT "fk_supplier_order_currency_code" FOREIGN KEY ("currency_code") REFERENCES "currency"("code")`
		);

		// Create indexes for the new columns
		await queryRunner.query(
			`CREATE INDEX "idx_supplier_order_region_id" ON "supplier_order" ("region_id")`
		);
		await queryRunner.query(
			`CREATE INDEX "idx_supplier_order_currency_code" ON "supplier_order" ("currency_code")`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop indexes
		await queryRunner.query(`DROP INDEX "idx_supplier_order_region_id"`);
		await queryRunner.query(`DROP INDEX "idx_supplier_order_currency_code"`);

		// Drop foreign key constraints
		await queryRunner.query(
			`ALTER TABLE "supplier_order" DROP CONSTRAINT "fk_supplier_order_region_id"`
		);
		await queryRunner.query(
			`ALTER TABLE "supplier_order" DROP CONSTRAINT "fk_supplier_order_currency_code"`
		);

		// Remove columns
		await queryRunner.query(
			`ALTER TABLE "supplier_order" DROP COLUMN "region_id"`
		);
		await queryRunner.query(
			`ALTER TABLE "supplier_order" DROP COLUMN "currency_code"`
		);
	}
}
