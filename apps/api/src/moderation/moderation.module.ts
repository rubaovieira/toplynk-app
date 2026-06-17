import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { User } from '../users/user.entity';
import { ContentReport } from './content-report.entity';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { UserBlock } from './user-block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserBlock, ContentReport, User]), AuthModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
