import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLineItemWarehouseQuantity1732609182456
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "line_item" ADD COLUMN "warehouse_quantity" integer DEFAULT 0`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "line_item" DROP COLUMN "warehouse_quantity"`
		);
	}
}
