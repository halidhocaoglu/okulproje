import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationTypes } from '../notifications/constants/notification-types.constant';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateGroupInviteDto } from './dto/create-group-invite.dto';
import { RespondGroupInviteDto } from './dto/respond-group-invite.dto';
import { GroupsRepository } from './groups.repository';

@Injectable()
export class GroupsService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(user: CurrentUser) {
    this.assertUser(user);
    return this.groupsRepository.findAll(user.schoolId);
  }

  async findById(user: CurrentUser, groupId: string) {
    this.assertUser(user);
    const group = await this.groupsRepository.findById(user.schoolId, groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async create(user: CurrentUser, dto: CreateGroupDto) {
    this.assertUser(user);
    return this.groupsRepository.create(user.schoolId, user.id, dto);
  }

  async listReceivedInvites(user: CurrentUser) {
    this.assertUser(user);
    return this.groupsRepository.listReceivedInvites(user.schoolId, user.id);
  }

  async inviteMember(user: CurrentUser, groupId: string, dto: CreateGroupInviteDto) {
    this.assertUser(user);
    if (dto.inviteeId === user.id) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const group = await this.groupsRepository.findById(user.schoolId, groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = await this.groupsRepository.findGroupMemberRole(
      user.schoolId,
      groupId,
      user.id,
    );
    if (!membership || !['owner', 'admin'].includes(membership.roomRole)) {
      throw new ForbiddenException('Only group owners or admins can invite members');
    }

    const invitee = await this.groupsRepository.findUserById(user.schoolId, dto.inviteeId);
    if (!invitee) {
      throw new NotFoundException('Invitee not found');
    }

    const existingMembership = await this.groupsRepository.findGroupMemberRole(
      user.schoolId,
      groupId,
      dto.inviteeId,
    );
    if (existingMembership) {
      throw new BadRequestException('User is already a group member');
    }

    const existingInvite = await this.groupsRepository.findPendingInvite(groupId, dto.inviteeId);
    if (existingInvite) {
      throw new BadRequestException('A pending invite already exists for this user');
    }

    const invite = await this.groupsRepository.createInvite(
      user.schoolId,
      groupId,
      user.id,
      dto.inviteeId,
    );

    await this.notificationsService.createNotification({
      schoolId: user.schoolId,
      userId: dto.inviteeId,
      type: NotificationTypes.GroupInvite,
      title: 'Group invitation',
      body: `${user.username ?? user.email} invited you to join ${group.name}.`,
      referenceType: 'group',
      referenceId: groupId,
      metadata: {
        inviteId: invite.id,
        inviterId: user.id,
      },
    });

    return invite;
  }

  async respondToInvite(user: CurrentUser, inviteId: string, dto: RespondGroupInviteDto) {
    this.assertUser(user);
    const invite = await this.groupsRepository.findInviteById(user.schoolId, inviteId);
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (String(invite.invitee_id) !== user.id) {
      throw new ForbiddenException('Only the invitee can respond');
    }
    if (String(invite.status) !== 'pending') {
      return invite;
    }

    return this.groupsRepository.respondToInvite(user.schoolId, inviteId, dto.action);
  }

  async remove(user: CurrentUser, groupId: string) {
    this.assertUser(user);

    const group = await this.groupsRepository.findById(user.schoolId, groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = await this.groupsRepository.findGroupMemberRole(
      user.schoolId,
      groupId,
      user.id,
    );
    const canDelete =
      group.ownerId === user.id || Boolean(membership && ['owner', 'admin'].includes(membership.roomRole));

    if (!canDelete) {
      throw new ForbiddenException('Only group owners or admins can delete groups');
    }

    const removed = await this.groupsRepository.remove(user.schoolId, groupId);
    if (!removed) {
      throw new NotFoundException('Group not found');
    }

    return { removed: true, id: groupId };
  }

  private assertUser(user: CurrentUser) {
    if (!user?.id || !user?.schoolId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
