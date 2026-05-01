import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatsTables1746400000000 implements MigrationInterface {
  name = 'CreateChatsTables1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_a_id" uuid NOT NULL,
        "user_b_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_user_a" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversations_user_b" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_conversations_order" CHECK (("user_a_id")::text < ("user_b_id")::text)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_conversations_pair" ON "conversations" ("user_a_id", "user_b_id")`);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "body" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_conversation_created" ON "messages" ("conversation_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
  }
}
