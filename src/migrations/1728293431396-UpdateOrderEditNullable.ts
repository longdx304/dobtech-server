import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrderEditNullable1728293431396
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Make order_id nullable
		await queryRunner.query(
			`ALTER TABLE "order_edit" ALTER COLUMN "order_id" DROP NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
        // Make order_id NOT NULL again
        await queryRunner.query(
            `ALTER TABLE "order_edit" ALTER COLUMN "order_id" SET NOT NULL`
        );
    }
}
