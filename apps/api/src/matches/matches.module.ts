import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PushModule } from '../push/push.module';
import { MatchesController } from './matches.controller';

@Module({
  imports: [AuthModule, PushModule],
  controllers: [MatchesController],
})
export class MatchesModule {}
