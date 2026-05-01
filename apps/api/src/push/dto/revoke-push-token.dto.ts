import { IsString, MaxLength, MinLength } from 'class-validator';

export class RevokePushTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  token!: string;
}
