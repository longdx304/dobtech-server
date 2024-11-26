import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateHandlerForOrder1732591452666 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "order" ADD COLUMN "handler_id" character varying NULL`
		);

		// Add foreign key constraint
		await queryRunner.query(
			`ALTER TABLE "order" ADD CONSTRAINT "fk_order_handler_id" FOREIGN KEY ("handler_id") REFERENCES "user" ("id")`
		);

		// Create index
		await queryRunner.query(
			`CREATE INDEX "idx_order_handler_id" ON "order" ("handler_id")`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop the foreign key constraint first
		await queryRunner.query(
			`ALTER TABLE "order" DROP CONSTRAINT "fk_order_handler_id"`
		);

		// Drop the index
		await queryRunner.query(`DROP INDEX "idx_order_handler_id"`);

		// Drop the column
		await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "handler_id"`);
	}
}
