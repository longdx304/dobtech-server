import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAllowedQuantitiesProductVariant1727661747803
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'ALTER TABLE "product_variant" ADD "allowed_quantities" int4 DEFAULT 6 NULL'
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'ALTER TABLE "product_variant" DROP COLUMN "allowed_quantities"'
		);
	}

}
