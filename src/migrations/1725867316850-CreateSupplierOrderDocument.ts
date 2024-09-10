import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSupplierOrderDocument1725867316850 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query(
				`CREATE TABLE "supplier_order_documents" (
						"id" character varying NOT NULL,
						"supplier_order_id" character varying NOT NULL,
						"document_url" character varying NOT NULL,
						"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
						"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
						"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
						PRIMARY KEY ("id"),
						CONSTRAINT "fk_supplier_order_documents_supplier_order_id" FOREIGN KEY ("supplier_order_id") REFERENCES "supplier_orders"("id")
				)`
			);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query(`DROP TABLE "supplier_order_documents"`);
    }

}
