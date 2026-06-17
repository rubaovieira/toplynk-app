import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { DiscoveryIncoming } from './discovery/discovery-incoming.entity';
import { DiscoverySwipe } from './discovery/discovery-swipe.entity';
import { ContentReport } from './moderation/content-report.entity';
import { UserBlock } from './moderation/user-block.entity';
import { AppNotification } from './notifications/app-notification.entity';
import { DeviceToken } from './push/device-token.entity';
import { User } from './users/user.entity';

loadEnv({ path: ['.env.local', '.env'] });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'toplynk',
  entities: [User, DeviceToken, DiscoverySwipe, DiscoveryIncoming, AppNotification, UserBlock, ContentReport],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});

export default AppDataSource;
