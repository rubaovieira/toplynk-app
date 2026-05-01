import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeviceTokens1746600000000 implements MigrationInterface {
  name = 'CreateDeviceTokens1746600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "device_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "expo_token" text NOT NULL,
        "platform" character varying(16) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_device_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_device_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_device_tokens_expo_token" UNIQUE ("expo_token")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_device_tokens_user_id" ON "device_tokens" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "device_tokens"`);
  }
}
