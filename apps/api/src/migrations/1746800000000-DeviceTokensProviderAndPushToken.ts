import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DeviceTokensProviderAndPushToken1746800000000 implements MigrationInterface {
  name = 'DeviceTokensProviderAndPushToken1746800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT IF EXISTS "UQ_device_tokens_expo_token"`);
    await queryRunner.query(`ALTER TABLE "device_tokens" RENAME COLUMN "expo_token" TO "push_token"`);
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD COLUMN "provider" character varying(32) NOT NULL DEFAULT 'expo'`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "UQ_device_tokens_push_token" UNIQUE ("push_token")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT IF EXISTS "UQ_device_tokens_push_token"`);
    await queryRunner.query(`ALTER TABLE "device_tokens" DROP COLUMN "provider"`);
    await queryRunner.query(`ALTER TABLE "device_tokens" RENAME COLUMN "push_token" TO "expo_token"`);
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "UQ_device_tokens_expo_token" UNIQUE ("expo_token")`,
    );
  }
}
