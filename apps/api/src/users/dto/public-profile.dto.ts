import { Expose } from 'class-transformer';

/** Resposta segura para ver o perfil de outro utilizador (sem e-mail). */
export class PublicProfileDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  headline: string;

  @Expose()
  tagline: string;

  @Expose()
  photoSeeds: string[];

  @Expose()
  bio: string;

  @Expose()
  activityAreaIds: string[];

  @Expose()
  interestIds: string[];

  @Expose()
  cityLabel: string;

  /** ISO 8601; null se nunca reportou atividade. */
  @Expose()
  lastSeenAt: Date | null;
}
