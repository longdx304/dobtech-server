import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentSessionUpdateFK1720516789996 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the existing foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "payment_session" DROP CONSTRAINT IF EXISTS "FK_d25ba0787e1510ddc5d442ebcfa"`
    );

    // Add the new foreign key constraint with ON DELETE CASCADE
    await queryRunner.query(
      `ALTER TABLE "payment_session"
             ADD CONSTRAINT "FK_d25ba0787e1510ddc5d442ebcfa"
             FOREIGN KEY ("cart_id") REFERENCES "cart"("id")
             ON DELETE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the changes in the down method
    await queryRunner.query(
      `ALTER TABLE "payment_session" DROP CONSTRAINT IF EXISTS "FK_d25ba0787e1510ddc5d442ebcfa"`
    );

    await queryRunner.query(
      `ALTER TABLE "payment_session"
             ADD CONSTRAINT "FK_d25ba0787e1510ddc5d442ebcfa"
             FOREIGN KEY ("cart_id") REFERENCES "cart"("id")`
    );
  }
}
