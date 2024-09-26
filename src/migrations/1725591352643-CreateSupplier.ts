import { generateEntityId } from '@medusajs/medusa';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplier1725591352643 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "supplier" (
            "id" character varying NOT NULL,
            "email" character varying NOT NULL,
            "supplier_name" character varying NOT NULL,
            "phone" character varying,
            "address" character varying,
            "estimated_production_time" integer NOT NULL,
            "settlement_time" integer NOT NULL,
            "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            PRIMARY KEY ("id")
          )`
    );

    await queryRunner.query(
      `INSERT INTO "supplier" (
            "id", 
            "email", 
            "supplier_name", 
            "phone", 
            "address", 
            "estimated_production_time", 
            "settlement_time", 
            "metadata", 
            "created_at", 
            "updated_at"
          ) VALUES (
            '${generateEntityId('', 'supplier')}', 
            'test@test.com', 
            'Test Supplier', 
            '1234567890', 
            '123 Test St, Test City, Test Country', 
            7, 
            7, 
            '{}'::jsonb, 
            now(), 
            now()
          )`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "supplier"`);
  }
}
