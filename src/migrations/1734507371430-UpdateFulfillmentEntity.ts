import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFulfillmentEntity1734507371430
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add enum type first
		await queryRunner.query(`
            CREATE TYPE "fulfillment_status_enum" AS ENUM (
                'awaiting',
                'delivering',
                'shipped',
                'canceled'
            )
        `);

		// Add new columns to fulfillment table
		await queryRunner.query(`
            ALTER TABLE "fulfillment"
            ADD COLUMN "shipped_id" character varying,
            ADD COLUMN "checker_id" character varying,
            ADD COLUMN "checked_at" TIMESTAMPTZ NULL,
            ADD COLUMN "checker_url" text,
            ADD COLUMN "shipped_url" text,
            ADD COLUMN "status" "fulfillment_status_enum" NOT NULL DEFAULT 'awaiting'
        `);
		//Add foreign key constraint
		await queryRunner.query(`
			ALTER TABLE "fulfillment" ADD CONSTRAINT "fk_fulfillment_shipped_id" FOREIGN KEY ("shipped_id") REFERENCES "user" ("id")
		`);
		await queryRunner.query(`
			ALTER TABLE "fulfillment" ADD CONSTRAINT "fk_fulfillment_checker_id" FOREIGN KEY ("checker_id") REFERENCES "user" ("id")
		`);

		// Create indexes
		await queryRunner.query(`
            CREATE INDEX "IDX_fulfillment_shipped_id" ON "fulfillment" ("shipped_id");
            CREATE INDEX "IDX_fulfillment_checker_id" ON "fulfillment" ("checker_id");
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop indexes first
		await queryRunner.query(`
            DROP INDEX "IDX_fulfillment_shipped_id";
            DROP INDEX "IDX_fulfillment_checker_id";
        `);

		// Drop columns
		await queryRunner.query(`
            ALTER TABLE "fulfillment"
            DROP COLUMN "shipped_id",
            DROP COLUMN "checker_id",
            DROP COLUMN "checked_at",
            DROP COLUMN "checker_url",
            DROP COLUMN "shipped_url",
            DROP COLUMN "status"
        `);

		// Drop enum type
		await queryRunner.query(`
            DROP TYPE "fulfillment_status_enum"
        `);
	}
}
