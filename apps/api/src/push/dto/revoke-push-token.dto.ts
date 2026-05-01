import { IsString, MaxLength, MinLength } from 'class-validator';

export class RevokePushTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token!: string;
}
