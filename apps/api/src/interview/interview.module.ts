import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InterviewAudioService } from './interview-audio.service';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

@Module({
  imports: [AuthModule],
  controllers: [InterviewController],
  providers: [InterviewService, InterviewAudioService],
})
export class InterviewModule {}
