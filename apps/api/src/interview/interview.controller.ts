import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { InterviewTranscribeDto } from './dto/interview-transcribe.dto';
import { InterviewTurnDto } from './dto/interview-turn.dto';
import { InterviewThrottlerGuard } from './interview-throttler.guard';
import { InterviewService, type InterviewTurnResult } from './interview.service';
import { OptionalJwtGuard } from './optional-jwt.guard';

/** ~1 fala a cada 3s já é rápido demais para uso humano legítimo. */
const INTERVIEW_RATE = { default: { limit: 20, ttl: 60_000 } };

@Controller('interview')
@UseGuards(InterviewThrottlerGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  /**
   * Rota nova: só o binário com voz a chama, então nasce guardada sem risco
   * de compatibilidade — e é a que custa dinheiro por chamada.
   */
  @Post('transcribe')
  @UseGuards(AuthGuard('jwt'))
  @Throttle(INTERVIEW_RATE)
  transcribe(@Body() dto: InterviewTranscribeDto): Promise<{ text: string }> {
    return this.interviewService.transcribe(dto);
  }

  /** Guarda condicionada a `INTERVIEW_REQUIRE_AUTH` — ver OptionalJwtGuard. */
  @Post('turn')
  @UseGuards(OptionalJwtGuard)
  @Throttle(INTERVIEW_RATE)
  turn(@Body() dto: InterviewTurnDto): Promise<InterviewTurnResult> {
    return this.interviewService.runTurn(dto);
  }
}
