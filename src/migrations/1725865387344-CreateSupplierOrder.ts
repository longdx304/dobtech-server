import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplierOrder1725865387344 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "supplier_order" (
					"id" character varying NOT NULL,
					"display_id" serial4 NOT NULL,
					"supplier_id" character varying NOT NULL,
					"user_id" character varying NOT NULL,
					"cart_id" character varying NOT NULL,
					"status" character varying DEFAULT 'pending',
					"payment_status" character varying DEFAULT 'not_paid',
					"fulfillment_status" character varying DEFAULT 'not_fulfilled',
					"estimated_production_time" TIMESTAMP WITH TIME ZONE NOT NULL,
					"settlement_time" TIMESTAMP WITH TIME ZONE NOT NULL,
					"tax_rate" float4 DEFAULT 0,
					"metadata" jsonb DEFAULT '{}'::jsonb,
					"no_notification" boolean DEFAULT false,
					"created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
					"updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
					"canceled_at" TIMESTAMP WITH TIME ZONE NULL,
					PRIMARY KEY ("id"),
					CONSTRAINT "uq_supplier_order_cart_id" UNIQUE ("cart_id"),
					CONSTRAINT "fk_supplier_order_supplier_id" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id"),
					CONSTRAINT "fk_supplier_order_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id"),
					CONSTRAINT "fk_supplier_order_cart_id" FOREIGN KEY ("cart_id") REFERENCES "cart"("id")
				)`
		);

		// Create index
		await queryRunner.query(`CREATE INDEX "idx_supplier_order_user_id" ON "supplier_order" ("user_id")`);
		await queryRunner.query(`CREATE INDEX "idx_supplier_order_display_id" ON "supplier_order" ("display_id")`);
		await queryRunner.query(`CREATE INDEX "idx_supplier_order_cart_id" ON "supplier_order" ("cart_id")`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Delete index
		await queryRunner.query(`DROP INDEX "idx_supplier_order_cart_id"`);
		await queryRunner.query(`DROP INDEX "idx_supplier_order_display_id"`);
		await queryRunner.query(`DROP INDEX "idx_supplier_order_user_id"`);

		// Delete table
		await queryRunner.query(`DROP TABLE "supplier_order"`);
	}
}