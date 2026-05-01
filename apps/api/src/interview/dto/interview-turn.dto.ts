import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { InterviewMessageDto } from './interview-message.dto';

export class InterviewTurnDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  locale: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InterviewMessageDto)
  messages: InterviewMessageDto[];
}
