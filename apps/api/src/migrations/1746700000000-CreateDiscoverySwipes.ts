import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDiscoverySwipes1746700000000 implements MigrationInterface {
  name = 'CreateDiscoverySwipes1746700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "discovery_swipes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "viewer_id" uuid NOT NULL,
        "peer_id" uuid NOT NULL,
        "action" character varying(16) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_discovery_swipes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_discovery_swipes_viewer" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_discovery_swipes_peer" FOREIGN KEY ("peer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_discovery_swipes_viewer_peer" UNIQUE ("viewer_id", "peer_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_discovery_swipes_viewer_id" ON "discovery_swipes" ("viewer_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "discovery_swipes"`);
  }
}
