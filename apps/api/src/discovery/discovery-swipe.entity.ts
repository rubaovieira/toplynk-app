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

export type DiscoverySwipeAction = 'pass' | 'like' | 'super';

@Entity('discovery_swipes')
@Unique('UQ_discovery_swipes_viewer_peer', ['viewerId', 'peerId'])
@Index('IDX_discovery_swipes_viewer_id', ['viewerId'])
export class DiscoverySwipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'viewer_id', type: 'uuid' })
  viewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viewer_id' })
  viewer: User;

  @Column({ name: 'peer_id', type: 'uuid' })
  peerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'peer_id' })
  peer: User;

  @Column({ type: 'varchar', length: 16 })
  action: DiscoverySwipeAction;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
