import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRefundWithSupplierOrder1729217548110
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// add new column
		await queryRunner.query(`
            ALTER TABLE "refund"
            ADD "supplier_order_id" character varying
        `);

		// add foreign key
		await queryRunner.query(`
            ALTER TABLE "refund"
            ADD CONSTRAINT "fk_refund_supplier_order_id" FOREIGN KEY ("supplier_order_id") REFERENCES "supplier_order" ("id")
        `);

		// add index
		await queryRunner.query(`
            CREATE INDEX "idx_refund_supplier_order_id" ON "refund" ("supplier_order_id")
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// delete index
		await queryRunner.query(`DROP INDEX "idx_refund_supplier_order_id"`);

		// delete foreign key
		await queryRunner.query(
			`ALTER TABLE "refund" DROP CONSTRAINT "fk_refund_supplier_order_id"`
		);

		// delete column
		await queryRunner.query(
			`ALTER TABLE "refund" DROP COLUMN "supplier_order_id"`
		);
	}
}
