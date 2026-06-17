import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import type { ContentReportReason } from '../content-report.entity';

const REASONS: ContentReportReason[] = ['spam', 'harassment', 'fake', 'inappropriate', 'other'];

export class CreateReportDto {
  @IsUUID('4')
  reportedUserId: string;

  @IsIn(REASONS)
  reason: ContentReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;

  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @IsOptional()
  @IsUUID('4')
  messageId?: string;
}
