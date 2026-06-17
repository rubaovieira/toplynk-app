import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * App Store compliance (Guidelines 1.2 e 5.1.1(v)):
 *  - `user_blocks`: bloqueio entre utilizadores (block abusive users).
 *  - `content_reports`: denúncias de conteúdo/utilizador (flag objectionable content,
 *    com trilha para moderação atuar em 24h).
 *  - `users.deleted_at`: conta anonimizada (account deletion) — impede login.
 *  - `users.eula_accepted_at`: registo de aceitação do EULA no cadastro.
 */
export class UgcModerationAndAccountDeletion1746920000000 implements MigrationInterface {
  name = 'UgcModerationAndAccountDeletion1746920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "eula_accepted_at" TIMESTAMPTZ NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_blocks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "blocker_id" uuid NOT NULL,
        "blocked_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_blocks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_blocks_blocker" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_blocks_blocked" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_user_blocks_pair" UNIQUE ("blocker_id", "blocked_id"),
        CONSTRAINT "CHK_user_blocks_self" CHECK ("blocker_id" <> "blocked_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_blocks_blocker" ON "user_blocks" ("blocker_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_blocks_blocked" ON "user_blocks" ("blocked_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reporter_id" uuid NOT NULL,
        "reported_user_id" uuid NOT NULL,
        "conversation_id" uuid NULL,
        "message_id" uuid NULL,
        "reason" character varying(48) NOT NULL,
        "details" text NULL,
        "status" character varying(24) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "resolved_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_content_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_content_reports_reporter" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_content_reports_reported" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_content_reports_status_created" ON "content_reports" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_content_reports_reported" ON "content_reports" ("reported_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "content_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_blocks"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "eula_accepted_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at"`);
  }
}
