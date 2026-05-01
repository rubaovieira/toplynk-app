import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class InterviewMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content: string;
}
