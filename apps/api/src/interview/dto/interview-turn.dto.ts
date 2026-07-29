import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { InterviewMessageDto } from './interview-message.dto';
import { TTS_VOICES } from '../interview.constants';

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

  /**
   * Quando true, a resposta traz `audioBase64` com a fala do assistente.
   * O cliente manda false quando o usuário silenciou a voz — isso corta o
   * custo do TTS e 1–3s de latência, em vez de mutar um áudio já pago.
   */
  @IsOptional()
  @IsBoolean()
  speak?: boolean;

  @IsOptional()
  @IsIn(TTS_VOICES)
  voice?: string;
}
