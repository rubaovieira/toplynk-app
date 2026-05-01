import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Message } from './message.entity';

/** Par 1:1 normalizado com `user_a_id` &lt; `user_b_id` (ordem lexicográfica). */
@Entity('conversations')
@Index(['userAId', 'userBId'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_a_id', type: 'uuid' })
  userAId: string;

  @Column({ name: 'user_b_id', type: 'uuid' })
  userBId: string;

  @OneToMany(() => Message, (m: Message) => m.conversation, {
    cascade: ['insert'],
  })
  messages: Message[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
