import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTransaction1731983342304
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "inventory_transaction" (
                "id" character varying NOT NULL,
                "variant_id" character varying NOT NULL,
                "warehouse_id" character varying NOT NULL,
                "order_id" character varying NULL,
                "quantity" integer NOT NULL,
                "type" character varying NOT NULL,
                "note" character varying,
                "user_id" character varying,
                "metadata" jsonb DEFAULT '{}'::jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                PRIMARY KEY ("id"),
                CONSTRAINT "fk_inventory_transaction_warehouse" 
                    FOREIGN KEY ("warehouse_id") 
                    REFERENCES "warehouse"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_inventory_transaction_user"
                    FOREIGN KEY ("user_id")
                    REFERENCES "user"("id")
            )`
		);

		// Create index
		await queryRunner.query(`
            CREATE INDEX "idx_inventory_transaction_warehouse_id" 
            ON "inventory_transaction"("warehouse_id")
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "inventory_transaction"`);
	}
}
