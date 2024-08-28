import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhonePermissionUser1712888843740 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "user" 
			ADD "phone" varchar(15) NULL,
			ADD "permissions" varchar(128) NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "user" DROP COLUMN "phone", DROP COLUMN "permissions"`
		);
	}
}
