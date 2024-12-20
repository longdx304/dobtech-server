import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCogsForProductVariant1734595966972
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'ALTER TABLE "product_variant" ADD cogs_price int4 DEFAULT 0 NULL'
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'ALTER TABLE "product_variant" DROP COLUMN "cogs_price"'
		);
	}
}
