import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

export type ContentReportReason =
  | 'spam'
  | 'harassment'
  | 'fake'
  | 'inappropriate'
  | 'other';

export type ContentReportStatus = 'pending' | 'actioned' | 'dismissed';

/** Denúncia de utilizador / conteúdo. Base para a moderação atuar em 24h (Guideline 1.2). */
@Entity('content_reports')
@Index('IDX_content_reports_status_created', ['status', 'createdAt'])
@Index('IDX_content_reports_reported', ['reportedUserId'])
export class ContentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'reported_user_id', type: 'uuid' })
  reportedUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reported_user_id' })
  reportedUser: User;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId: string | null;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ type: 'varchar', length: 48 })
  reason: ContentReportReason;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status: ContentReportStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
