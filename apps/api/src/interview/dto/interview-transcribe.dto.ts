import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

import { AUDIO_MIME_TYPES, MAX_AUDIO_BASE64_CHARS } from '../interview.constants';

export class InterviewTranscribeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  locale: string;

  @IsIn(AUDIO_MIME_TYPES)
  mimeType: string;

  /**
   * Base64 puro, sem prefixo `data:` (diferente de `photosBase64`, que usa data URL).
   *
   * Deliberadamente sem `@IsBase64()`: a regra roda uma regex sobre ~320 KB a
   * cada request sem ganho real. A validação de verdade é o `Buffer.from` +
   * checagem de `byteLength` no service.
   */
  @IsString()
  @MinLength(64)
  @MaxLength(MAX_AUDIO_BASE64_CHARS)
  audioBase64: string;
}
