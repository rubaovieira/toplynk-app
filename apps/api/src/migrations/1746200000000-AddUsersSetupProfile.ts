import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersSetupProfile1746200000000 implements MigrationInterface {
  name = 'AddUsersSetupProfile1746200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "setup_profile" jsonb NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "setup_profile"`);
  }
}
