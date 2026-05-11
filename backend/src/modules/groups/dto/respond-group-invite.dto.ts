import { IsIn } from 'class-validator';

export class RespondGroupInviteDto {
  @IsIn(['accept', 'reject'])
  action!: 'accept' | 'reject';
}

