import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Padrão: Postgres local (`DB_DRIVER` omitido ou `postgres`).
 * Sem Postgres: `DB_DRIVER=sqlite` + `SQLITE_PATH`.
 */
export function typeOrmModuleOptions(config: ConfigService): TypeOrmModuleOptions {
  const driver = (config.get<string>('DB_DRIVER') ?? 'postgres').toLowerCase().trim();
  const devLogging = config.get<string>('NODE_ENV') === 'development';
  const synchronize = config.get<string>('NODE_ENV') !== 'production';

  if (driver === 'sqlite') {
    const relative = config.get<string>('SQLITE_PATH', 'data/toplynk.sqlite');
    const database = join(process.cwd(), relative);
    const dir = dirname(database);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return {
      type: 'sqlite',
      database,
      autoLoadEntities: true,
      synchronize,
      logging: devLogging,
    };
  }

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
    username: config.get<string>('DB_USER', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME', 'toplynk'),
    autoLoadEntities: true,
    synchronize: false,
    migrations: [join(__dirname, '..', 'migrations', '*.js')],
    logging: devLogging,
  };
}
