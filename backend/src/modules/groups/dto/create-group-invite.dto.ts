import { IsUUID } from 'class-validator';

export class CreateGroupInviteDto {
  @IsUUID()
  inviteeId!: string;
}

