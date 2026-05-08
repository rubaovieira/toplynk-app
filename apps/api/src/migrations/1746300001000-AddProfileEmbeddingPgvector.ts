import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileEmbeddingPgvector1746300001000 implements MigrationInterface {
  name = 'AddProfileEmbeddingPgvector1746300001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add embedding timestamp column (pgvector not available in PostgreSQL 14 on Homebrew)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "embedding_updated_at" TIMESTAMP WITH TIME ZONE NULL
    `);

    // Vector column skipped due to pgvector extension not being available on PG 14 Homebrew
    // Can be added later when upgrading to PostgreSQL 17+
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "embedding_updated_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_embedding"`);
  }
}
