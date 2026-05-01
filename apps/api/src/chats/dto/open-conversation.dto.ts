import { IsUUID } from 'class-validator';

export class OpenConversationDto {
  @IsUUID('4')
  peerId: string;
}
