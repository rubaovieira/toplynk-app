import { Body, Controller, Post } from '@nestjs/common';

import { InterviewTurnDto } from './dto/interview-turn.dto';
import { InterviewService, type InterviewTurnResult } from './interview.service';

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('turn')
  turn(@Body() dto: InterviewTurnDto): Promise<InterviewTurnResult> {
    return this.interviewService.runTurn(dto);
  }
}
