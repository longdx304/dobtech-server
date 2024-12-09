import { generateEntityId } from '@medusajs/medusa';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateItemUnitQuantity1731566170864 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "item_unit" (
                "id" character varying NOT NULL,
                "unit" character varying NOT NULL,
                "quantity" integer NOT NULL
            )`
		);

		// add constraint
		await queryRunner.query(
			`ALTER TABLE "item_unit" ADD CONSTRAINT "PK_item_unit_id" PRIMARY KEY ("id")`
		);

		await queryRunner.query(
			`INSERT INTO "item_unit" ("id", "unit", "quantity") VALUES ('default', 'đôi', 1)`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop the primary key constraint
		await queryRunner.query(
			`ALTER TABLE "item_unit" DROP CONSTRAINT "PK_item_unit_id"`
		);

		// Then drop the table
		await queryRunner.query(`DROP TABLE "item_unit"`);
	}
}
