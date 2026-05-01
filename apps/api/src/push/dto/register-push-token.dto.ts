import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  token!: string;

  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';
}
