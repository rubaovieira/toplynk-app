import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PushProvider = 'expo' | 'onesignal';

@Entity('device_tokens')
@Index('IDX_device_tokens_user_id', ['userId'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Expo `ExponentPushToken[...]` ou OneSignal subscription id. */
  @Column({ name: 'push_token', type: 'text', unique: true })
  pushToken: string;

  @Column({ type: 'varchar', length: 32, default: 'expo' })
  provider: PushProvider;

  @Column({ type: 'varchar', length: 16 })
  platform: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;
}
