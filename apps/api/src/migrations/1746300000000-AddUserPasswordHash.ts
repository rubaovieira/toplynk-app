import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPasswordHash1746300000000 implements MigrationInterface {
  name = 'AddUserPasswordHash1746300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "password_hash" character varying NULL
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."password_hash" IS 'bcrypt hash; NULL for legacy rows until password is set'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash"`);
  }
}
