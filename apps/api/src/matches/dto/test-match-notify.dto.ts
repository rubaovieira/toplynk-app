import { IsUUID } from 'class-validator';

export class TestMatchNotifyDto {
  @IsUUID('4')
  peerId!: string;
}
