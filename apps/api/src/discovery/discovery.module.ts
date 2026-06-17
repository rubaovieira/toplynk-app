import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushModule } from '../push/push.module';
import { User } from '../users/user.entity';
import { DiscoveryIncoming } from './discovery-incoming.entity';
import { DiscoverySwipe } from './discovery-swipe.entity';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DiscoverySwipe, DiscoveryIncoming]),
    AuthModule,
    PushModule,
    NotificationsModule,
    ModerationModule,
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
