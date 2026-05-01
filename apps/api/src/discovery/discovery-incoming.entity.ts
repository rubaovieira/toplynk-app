import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { User } from '../users/user.entity';

export type DiscoveryIncomingAction = 'like' | 'super';

@Entity('discovery_incoming')
@Unique('UQ_discovery_incoming_recipient_actor', ['recipientId', 'actorId'])
@Index('IDX_discovery_incoming_recipient_id', ['recipientId'])
export class DiscoveryIncoming {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'varchar', length: 16 })
  action: DiscoveryIncomingAction;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
