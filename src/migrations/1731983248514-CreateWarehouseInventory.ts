import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouseInventory1731983248514
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            CREATE TABLE "warehouse_inventory" (
                "id" character varying NOT NULL,
                "warehouse_id" character varying NOT NULL,
                "variant_id" character varying NOT NULL,
                "quantity" integer NOT NULL DEFAULT 0,
                "unit_id" character varying,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                PRIMARY KEY ("id"),
                CONSTRAINT "fk_warehouse_inventory_warehouse" 
                    FOREIGN KEY ("warehouse_id") 
                    REFERENCES "warehouse"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_warehouse_inventory_unit"
                    FOREIGN KEY ("unit_id")
                    REFERENCES "item_unit"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_warehouse_inventory_variant" 
                    FOREIGN KEY ("variant_id") 
                    REFERENCES "product_variant"("id") ON DELETE CASCADE,
                CONSTRAINT "unique_unit_variant" 
                    UNIQUE ("unit_id", "variant_id")
            )
        `);

        // Index for warehouse lookups
		await queryRunner.query(`
            CREATE INDEX "idx_warehouse_inventory_warehouse_id" 
            ON "warehouse_inventory"("warehouse_id")
        `);

        // Index for variant lookups
        await queryRunner.query(`
            CREATE INDEX "idx_warehouse_inventory_variant_id" 
            ON "warehouse_inventory"("variant_id")
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "warehouse_inventory"`);
	}
}
