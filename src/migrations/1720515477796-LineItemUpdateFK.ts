import { MigrationInterface, QueryRunner } from 'typeorm';

export class LineItemUpdateFK1720515477796 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing foreign key constraint if it exists
    await queryRunner.query(
      `ALTER TABLE "line_item" 
        DROP CONSTRAINT IF EXISTS "FK_27283ee631862266d0f1c680646"`
    );

    // Add the new foreign key constraint with ON DELETE CASCADE
    await queryRunner.query(
      `ALTER TABLE "line_item"
        ADD CONSTRAINT "FK_27283ee631862266d0f1c680646"
        FOREIGN KEY ("cart_id") REFERENCES "cart"("id")
        ON DELETE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "line_item" DROP CONSTRAINT IF EXISTS "FK_27283ee631862266d0f1c680646"`
    );

    // Add the old foreign key constraint without ON DELETE CASCADE
    await queryRunner.query(
      `ALTER TABLE "line_item"
        ADD CONSTRAINT "FK_27283ee631862266d0f1c680646"
        FOREIGN KEY ("cart_id") REFERENCES "cart"("id")`
    );
  }
}
