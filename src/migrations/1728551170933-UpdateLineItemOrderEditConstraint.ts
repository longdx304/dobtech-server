import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLineItemOrderEditConstraint1728551170933
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// First, drop the existing foreign key constraint
		await queryRunner.query(
			`ALTER TABLE "line_item" DROP CONSTRAINT IF EXISTS "line_item_order_edit_fk"`
		);

		// Then, recreate the foreign key constraint with ON DELETE CASCADE
		await queryRunner.query(
			`ALTER TABLE "line_item" ADD CONSTRAINT "line_item_order_edit_fk" 
            FOREIGN KEY ("order_edit_id") REFERENCES "order_edit"("id") ON DELETE CASCADE`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// First, drop the cascading foreign key constraint
		await queryRunner.query(
			`ALTER TABLE "line_item" DROP CONSTRAINT IF EXISTS "line_item_order_edit_fk"`
		);

		// Then, recreate the original foreign key constraint without CASCADE
		await queryRunner.query(
			`ALTER TABLE "line_item" ADD CONSTRAINT "line_item_order_edit_fk" 
            FOREIGN KEY ("order_edit_id") REFERENCES "order_edit"("id")`
		);
	}
}
