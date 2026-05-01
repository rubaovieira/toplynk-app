import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token!: string;

  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';

  /** `expo` (predefinido) ou `onesignal` (subscription id do SDK). */
  @IsOptional()
  @IsString()
  @IsIn(['expo', 'onesignal'])
  provider?: 'expo' | 'onesignal';
}
