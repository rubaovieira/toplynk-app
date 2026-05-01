import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersLastSeenAt1746500000000 implements MigrationInterface {
  name = 'AddUsersLastSeenAt1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ NULL
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."last_seen_at" IS 'Última atividade reportada (login, heartbeat); usado para presença aproximada'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_seen_at"`);
  }
}
