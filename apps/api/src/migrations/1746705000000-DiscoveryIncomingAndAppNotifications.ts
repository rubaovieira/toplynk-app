import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DiscoveryIncomingAndAppNotifications1746705000000 implements MigrationInterface {
  name = 'DiscoveryIncomingAndAppNotifications1746705000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "discovery_incoming" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recipient_id" uuid NOT NULL,
        "actor_id" uuid NOT NULL,
        "action" character varying(16) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_discovery_incoming_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_discovery_incoming_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_discovery_incoming_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_discovery_incoming_recipient_actor" UNIQUE ("recipient_id", "actor_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_discovery_incoming_recipient_id" ON "discovery_incoming" ("recipient_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "app_notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "data" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_app_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_app_notifications_user_created" ON "app_notifications" ("user_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_notifications"`);
    await queryRunner.query(`DROP TABLE "discovery_incoming"`);
  }
}
