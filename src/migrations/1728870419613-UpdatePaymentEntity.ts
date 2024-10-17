import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePaymentEntity1728870419613 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add 'supplier_order_id' column to 'payment' table
		await queryRunner.query(
			`ALTER TABLE "payment" ADD COLUMN "supplier_order_id" varchar NULL`
		);

		// Add foreign key constraint
		await queryRunner.query(
			`ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_supplier_order_id" FOREIGN KEY ("supplier_order_id") REFERENCES "supplier_order"("id")`
		);

		// Create index
		await queryRunner.query(
			`CREATE INDEX "IDX_payment_supplier_order_id" ON "payment" ("supplier_order_id")`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop index
		await queryRunner.query(`DROP INDEX "IDX_payment_supplier_order_id"`);

		// Drop foreign key constraint
		await queryRunner.query(
			`ALTER TABLE "payment" DROP CONSTRAINT "FK_payment_supplier_order_id"`
		);

		// Drop 'supplier_order_id' column
		await queryRunner.query(
			`ALTER TABLE "payment" DROP COLUMN "supplier_order_id"`
		);
	}
}
