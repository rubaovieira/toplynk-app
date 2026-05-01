import { IsBoolean, IsOptional } from 'class-validator';

export class PatchPushPreferencesDto {
  @IsOptional()
  @IsBoolean()
  pushNotifyMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifySocial?: boolean;
}
