import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLineItemForSupplierOrder1728276191297
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add 'supplier_order_id' column to 'line_item' table
		await queryRunner.query(
			`ALTER TABLE "line_item" ADD "supplier_order_id" varchar NULL`
		);

		// Add foreign key constraint linking 'supplier_order_id' to 'supplier_order' table
		await queryRunner.query(
			`ALTER TABLE "line_item" ADD CONSTRAINT "FK_supplier_order_id" 
			FOREIGN KEY ("supplier_order_id") REFERENCES "supplier_order"("id") ON DELETE SET NULL`
		);

		// Create index on 'supplier_order_id' column in 'line_item' table
		await queryRunner.query(
			`CREATE INDEX "IDX_supplier_order_id" ON "line_item" ("supplier_order_id")`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index on 'supplier_order_id' column in 'line_item' table
        await queryRunner.query(`DROP INDEX "IDX_supplier_order_id"`);

        // Drop foreign key constraint
        await queryRunner.query(
            `ALTER TABLE "line_item" DROP CONSTRAINT "FK_supplier_order_id"`
        );

        // Drop the 'supplier_order_id' column
        await queryRunner.query(
            `ALTER TABLE "line_item" DROP COLUMN "supplier_order_id"`
        );
    }
}
