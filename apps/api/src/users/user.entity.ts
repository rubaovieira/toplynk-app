import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  /** Dados do wizard de cadastro (merge incremental pelo PATCH /users/:id/profile). */
  @Column({ name: 'setup_profile', type: 'jsonb', nullable: true })
  setupProfile: Record<string, unknown> | null;

  /** Atualizado quando o embedding do perfil é recalculado (coluna profile_embedding via SQL). */
  @Column({ name: 'embedding_updated_at', type: 'timestamptz', nullable: true })
  embeddingUpdatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Última atividade (login / POST presença). Usado para “online” aproximado no chat. */
  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  /** Push de novas mensagens (chat). */
  @Column({ name: 'push_notify_messages', type: 'boolean', default: true })
  pushNotifyMessages: boolean;

  /** Push de likes/supers no discovery. */
  @Column({ name: 'push_notify_social', type: 'boolean', default: true })
  pushNotifySocial: boolean;

  /** Aceitação do EULA / Termos de Uso no cadastro (Guideline 1.2). */
  @Column({ name: 'eula_accepted_at', type: 'timestamptz', nullable: true })
  eulaAcceptedAt: Date | null;

  /** Conta anonimizada via "Apagar conta" (Guideline 5.1.1(v)); login fica bloqueado. */
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
