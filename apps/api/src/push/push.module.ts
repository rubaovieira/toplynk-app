import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { User } from '../users/user.entity';
import { DeviceToken } from './device-token.entity';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([DeviceToken, User]), AuthModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
