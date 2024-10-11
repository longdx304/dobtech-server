import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrderEditSupplierOrder1728267527260
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add 'supplier_order_id' column to 'order_edit' table
		await queryRunner.query(
			`ALTER TABLE "order_edit" ADD COLUMN "supplier_order_id" varchar`
		);

		// Add foreign key constraint linking 'supplier_order_id' to 'supplier_order' table
		await queryRunner.query(
			`ALTER TABLE "order_edit" ADD CONSTRAINT "FK_order_edit_supplier_order_id" 
      FOREIGN KEY ("supplier_order_id") REFERENCES "supplier_order"("id")`
		);

		// Create index on 'supplier_order_id' column in 'order_edit' table
		await queryRunner.query(
			`CREATE INDEX "IDX_order_edit_supplier_order_id" ON "order_edit" ("supplier_order_id")`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop the index on 'supplier_order_id'
		await queryRunner.query(
			`DROP INDEX IF EXISTS "IDX_order_edit_supplier_order_id"`
		);

		// Drop the foreign key constraint
		await queryRunner.query(
			`ALTER TABLE "order_edit" DROP CONSTRAINT IF EXISTS "FK_order_edit_supplier_order_id"`
		);

		// Drop the 'supplier_order_id' column
		await queryRunner.query(
			`ALTER TABLE "order_edit" DROP COLUMN IF EXISTS "supplier_order_id"`
		);
	}
}
