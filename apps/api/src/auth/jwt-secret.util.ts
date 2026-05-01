import type { ConfigService } from '@nestjs/config';

/** Só para desenvolvimento local quando `.env` não define JWT_SECRET. Nunca uses em produção. */
const DEV_FALLBACK_JWT_SECRET =
  'toplynk_local_dev_jwt_secret_min_32_chars_do_not_use_in_production';

export function resolveJwtSecret(config: ConfigService): string {
  const fromEnv = config.get<string>('JWT_SECRET')?.trim();
  if (fromEnv) return fromEnv;
  const nodeEnv = (config.get<string>('NODE_ENV') ?? 'development').toLowerCase();
  if (nodeEnv === 'production') {
    throw new Error(
      'JWT_SECRET must be set in production. Add it to apps/api/.env (see .env.example).',
    );
  }
  return DEV_FALLBACK_JWT_SECRET;
}
