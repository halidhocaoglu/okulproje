import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUserDecorator, CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateGroupInviteDto } from './dto/create-group-invite.dto';
import { RespondGroupInviteDto } from './dto/respond-group-invite.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  findAll(@CurrentUserDecorator() user: CurrentUser) {
    return this.groupsService.findAll(user);
  }

  @Get('invites/received')
  listReceivedInvites(@CurrentUserDecorator() user: CurrentUser) {
    return this.groupsService.listReceivedInvites(user);
  }

  @Post('invites/:inviteId/respond')
  respondToInvite(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('inviteId') inviteId: string,
    @Body() dto: RespondGroupInviteDto,
  ) {
    return this.groupsService.respondToInvite(user, inviteId, dto);
  }

  @Get(':groupId')
  findById(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.findById(user, groupId);
  }

  @Post()
  create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groupsService.create(user, dto);
  }

  @Post(':groupId/invites')
  inviteMember(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Body() dto: CreateGroupInviteDto,
  ) {
    return this.groupsService.inviteMember(user, groupId, dto);
  }
}
