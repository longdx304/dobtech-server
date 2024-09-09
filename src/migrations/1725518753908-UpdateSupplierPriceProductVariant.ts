import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSupplierPriceProductVariant1725518753908 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query('ALTER TABLE "product_variant" ADD supplier_price int4 DEFAULT 0 NULL')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query('ALTER TABLE "product_variant" DROP COLUMN "supplier_price"')
    }

}
