import { IsIn, IsUUID } from 'class-validator';

import type { DiscoverySwipeAction } from '../discovery-swipe.entity';

export class DiscoverySwipeDto {
  @IsUUID('4')
  peerId: string;

  @IsIn(['pass', 'like', 'super'])
  action: DiscoverySwipeAction;
}
