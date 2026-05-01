import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileEmbeddingPgvector1746300001000 implements MigrationInterface {
  name = 'AddProfileEmbeddingPgvector1746300001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "profile_embedding" vector(1536) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "embedding_updated_at" TIMESTAMP WITH TIME ZONE NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "embedding_updated_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_embedding"`);
  }
}
