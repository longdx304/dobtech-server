import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSupplierOrderWarehouse1731641096043
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add new columns
		await queryRunner.query(
			`ALTER TABLE "supplier_order"
				ADD COLUMN "delivered_at" TIMESTAMP WITH TIME ZONE NULL,
                ADD COLUMN "inventoried_at" TIMESTAMP WITH TIME ZONE NULL,
                ADD COLUMN "rejected_at" TIMESTAMP WITH TIME ZONE NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop new columns
		await queryRunner.query(
			`ALTER TABLE "supplier_order"
                DROP COLUMN "delivered_at",
                DROP COLUMN "inventoried_at",
                DROP COLUMN "rejected_at"`
		);
	}
}
