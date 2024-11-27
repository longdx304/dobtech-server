import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveFulfillmentLineItemContraint1732609182456
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// drop foreign key constraint
		await queryRunner.query(
			`ALTER TABLE "line_item" DROP CONSTRAINT "CHK_c61716c68f5ad5de2834c827d3"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// add check constraint
		await queryRunner.query(`
			ALTER TABLE "line_item" 
			ADD CONSTRAINT "CHK_c61716c68f5ad5de2834c827d3" 
			CHECK ("fulfilled_quantity" <= "quantity")
		`);
	}
}
