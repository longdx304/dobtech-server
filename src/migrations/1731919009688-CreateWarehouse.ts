import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouse1731919009688 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "warehouse" (
                "id" character varying NOT NULL,
                "location" character varying NOT NULL,
                "capacity" integer NULL,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
                PRIMARY KEY ("id")
            )`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "warehouse"`);
	}
}
