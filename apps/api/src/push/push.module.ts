import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { DeviceToken } from './device-token.entity';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceToken]), AuthModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
