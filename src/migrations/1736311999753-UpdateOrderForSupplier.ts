import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOrderForSupplier1736311999753 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "supplier_order" 
            ADD COLUMN "shipping_started_date" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
            ADD COLUMN "warehouse_entry_date" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
            ADD COLUMN "completed_payment_date" TIMESTAMP WITH TIME ZONE DEFAULT NULL`
        )

        await queryRunner.query(
            `ALTER TABLE "supplier" 
            ADD COLUMN "completed_payment_date" integer DEFAULT NULL,
            ADD COLUMN "warehouse_entry_date" integer DEFAULT NULL`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "supplier_order" 
            DROP COLUMN "shipping_started_date",
            DROP COLUMN "warehouse_entry_date",
            DROP COLUMN "completed_payment_date"`
        )

        await queryRunner.query(
            `ALTER TABLE "supplier" 
            DROP COLUMN "completed_payment_date",
            DROP COLUMN "warehouse_entry_date"`
        )
    }
}
