import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPushNotifyPreferences1746910000000 implements MigrationInterface {
  name = 'UserPushNotifyPreferences1746910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "push_notify_messages" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "push_notify_social" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "push_notify_social"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "push_notify_messages"`);
  }
}
