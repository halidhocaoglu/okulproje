import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

import { DATABASE_POOL } from '../../infrastructure/database/database.constants';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsRepository {
  private schemaReady = false;

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAll(schoolId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT
          g.id,
          g.school_id,
          g.owner_id,
          g.name,
          g.slug,
          g.description,
          g.visibility,
          g.created_at,
          g.updated_at,
          owner.full_name AS owner_full_name,
          owner.username AS owner_username,
          room.id AS room_id,
          COUNT(DISTINCT member.user_id)::int AS member_count
        FROM groups g
        LEFT JOIN users owner ON owner.id = g.owner_id
        LEFT JOIN chat_rooms room
          ON room.group_id = g.id
         AND room.room_type = 'group'
         AND room.is_active = true
         AND room.is_archived = false
        LEFT JOIN chat_room_members member
          ON member.room_id = room.id
         AND member.is_active = true
         AND member.left_at IS NULL
        WHERE g.school_id = $1
          AND g.is_active = true
        GROUP BY
          g.id,
          g.school_id,
          g.owner_id,
          g.name,
          g.slug,
          g.description,
          g.visibility,
          g.created_at,
          g.updated_at,
          owner.full_name,
          owner.username,
          room.id
        ORDER BY g.created_at DESC, g.id DESC
      `,
      [schoolId],
    );

    return result.rows.map((row) => this.mapGroup(row));
  }

  async findById(schoolId: string, groupId: string) {
    await this.ensureSchema();
    const groupResult = await this.pool.query(
      `
        SELECT
          g.id,
          g.school_id,
          g.owner_id,
          g.name,
          g.slug,
          g.description,
          g.visibility,
          g.created_at,
          g.updated_at,
          owner.full_name AS owner_full_name,
          owner.username AS owner_username,
          room.id AS room_id
        FROM groups g
        LEFT JOIN users owner ON owner.id = g.owner_id
        LEFT JOIN chat_rooms room
          ON room.group_id = g.id
         AND room.room_type = 'group'
         AND room.is_active = true
         AND room.is_archived = false
        WHERE g.school_id = $1
          AND g.id = $2
          AND g.is_active = true
        LIMIT 1
      `,
      [schoolId, groupId],
    );

    if (!groupResult.rowCount) {
      return null;
    }

    const membersResult = await this.pool.query(
      `
        SELECT
          member.user_id,
          member.room_role,
          member.joined_at,
          u.full_name,
          u.username,
          u.email
        FROM chat_room_members member
        INNER JOIN users u ON u.id = member.user_id
        INNER JOIN chat_rooms room ON room.id = member.room_id
        WHERE room.school_id = $1
          AND room.group_id = $2
          AND room.room_type = 'group'
          AND member.is_active = true
          AND member.left_at IS NULL
        ORDER BY member.joined_at ASC, member.user_id ASC
      `,
      [schoolId, groupId],
    );

    return {
      ...this.mapGroup(groupResult.rows[0]),
      members: membersResult.rows.map((row) => ({
        id: row.user_id,
        fullName: row.full_name,
        username: row.username,
        email: row.email,
        roomRole: row.room_role,
        joinedAt: row.joined_at,
      })),
      memberCount: membersResult.rowCount,
    };
  }

  async create(schoolId: string, ownerId: string, dto: CreateGroupDto) {
    await this.ensureSchema();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const slug = this.slugify(dto.name);
      const groupResult = await client.query(
        `
          INSERT INTO groups (
            school_id,
            owner_id,
            name,
            slug,
            description,
            visibility
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        [
          schoolId,
          ownerId,
          dto.name.trim(),
          slug || null,
          dto.description?.trim() ?? null,
          dto.visibility,
        ],
      );

      const groupId = groupResult.rows[0].id as string;
      const roomResult = await client.query(
        `
          INSERT INTO chat_rooms (
            school_id,
            room_type,
            group_id,
            created_by,
            name,
            description
          )
          VALUES ($1, 'group', $2, $3, $4, $5)
          RETURNING id
        `,
        [
          schoolId,
          groupId,
          ownerId,
          dto.name.trim(),
          dto.description?.trim() ?? null,
        ],
      );

      await client.query(
        `
          INSERT INTO chat_room_members (
            school_id,
            room_id,
            user_id,
            room_role,
            is_active,
            left_at
          )
          VALUES ($1, $2, $3, 'owner', true, NULL)
        `,
        [schoolId, roomResult.rows[0].id, ownerId],
      );

      await client.query('COMMIT');
      return this.findById(schoolId, groupId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findUserById(schoolId: string, userId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT id, email, full_name, username, role
        FROM users
        WHERE school_id = $1
          AND id = $2
        LIMIT 1
      `,
      [schoolId, userId],
    );

    return result.rowCount ? result.rows[0] : null;
  }

  async findGroupMemberRole(schoolId: string, groupId: string, userId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT member.room_role, room.id AS room_id
        FROM chat_room_members member
        INNER JOIN chat_rooms room ON room.id = member.room_id
        WHERE room.school_id = $1
          AND room.group_id = $2
          AND room.room_type = 'group'
          AND member.user_id = $3
          AND member.is_active = true
          AND member.left_at IS NULL
        LIMIT 1
      `,
      [schoolId, groupId, userId],
    );

    return result.rowCount
      ? {
          roomRole: String(result.rows[0].room_role),
          roomId: String(result.rows[0].room_id),
        }
      : null;
  }

  async findPendingInvite(groupId: string, inviteeId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT id, status
        FROM group_invites
        WHERE group_id = $1
          AND invitee_id = $2
          AND status = 'pending'
        LIMIT 1
      `,
      [groupId, inviteeId],
    );

    return result.rowCount ? result.rows[0] : null;
  }

  async createInvite(
    schoolId: string,
    groupId: string,
    inviterId: string,
    inviteeId: string,
  ) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        INSERT INTO group_invites (
          school_id,
          group_id,
          inviter_id,
          invitee_id,
          status
        )
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id, school_id, group_id, inviter_id, invitee_id, status, created_at, responded_at
      `,
      [schoolId, groupId, inviterId, inviteeId],
    );

    return result.rows[0];
  }

  async listReceivedInvites(schoolId: string, userId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT
          gi.id,
          gi.group_id,
          gi.inviter_id,
          gi.invitee_id,
          gi.status,
          gi.created_at,
          gi.responded_at,
          g.name AS group_name,
          g.description AS group_description,
          inviter.full_name AS inviter_full_name,
          inviter.username AS inviter_username
        FROM group_invites gi
        INNER JOIN groups g ON g.id = gi.group_id
        INNER JOIN users inviter ON inviter.id = gi.inviter_id
        WHERE gi.school_id = $1
          AND gi.invitee_id = $2
          AND gi.status = 'pending'
        ORDER BY gi.created_at DESC
      `,
      [schoolId, userId],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      groupId: String(row.group_id),
      status: String(row.status),
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      group: {
        id: String(row.group_id),
        name: String(row.group_name),
        description: row.group_description ? String(row.group_description) : null,
      },
      inviter: {
        id: String(row.inviter_id),
        fullName: row.inviter_full_name ? String(row.inviter_full_name) : null,
        username: row.inviter_username ? String(row.inviter_username) : null,
      },
    }));
  }

  async findInviteById(schoolId: string, inviteId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT id, school_id, group_id, inviter_id, invitee_id, status, created_at, responded_at
        FROM group_invites
        WHERE school_id = $1
          AND id = $2
        LIMIT 1
      `,
      [schoolId, inviteId],
    );

    return result.rowCount ? result.rows[0] : null;
  }

  async respondToInvite(schoolId: string, inviteId: string, action: 'accept' | 'reject') {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inviteResult = await client.query(
        `
          UPDATE group_invites
          SET
            status = $3,
            responded_at = now(),
            updated_at = now()
          WHERE school_id = $1
            AND id = $2
          RETURNING id, school_id, group_id, inviter_id, invitee_id, status, created_at, responded_at
        `,
        [schoolId, inviteId, action === 'accept' ? 'accepted' : 'rejected'],
      );

      const invite = inviteResult.rows[0];
      if (invite && action === 'accept') {
        const roomResult = await client.query(
          `
            SELECT id
            FROM chat_rooms
            WHERE school_id = $1
              AND group_id = $2
              AND room_type = 'group'
              AND is_active = true
              AND is_archived = false
            LIMIT 1
          `,
          [schoolId, invite.group_id],
        );

        if (roomResult.rowCount) {
          await client.query(
            `
              INSERT INTO chat_room_members (
                school_id,
                room_id,
                user_id,
                room_role,
                is_active,
                left_at
              )
              VALUES ($1, $2, $3, 'member', true, NULL)
              ON CONFLICT (room_id, user_id)
              DO UPDATE SET
                room_role = 'member',
                is_active = true,
                left_at = NULL,
                updated_at = now()
            `,
            [schoolId, roomResult.rows[0].id, invite.invitee_id],
          );
        }
      }

      await client.query('COMMIT');
      return invite;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureSchema() {
    if (this.schemaReady) {
      return;
    }

    await this.pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS group_invites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invitee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status varchar(32) NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        responded_at timestamptz NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_group_invites_invitee_status
        ON group_invites (invitee_id, status, created_at DESC);
    `);

    this.schemaReady = true;
  }

  private mapGroup(row: Record<string, any>) {
    return {
      id: row.id,
      schoolId: row.school_id,
      ownerId: row.owner_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      visibility: row.visibility,
      roomId: row.room_id,
      memberCount: Number(row.member_count ?? 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      owner: row.owner_id
        ? {
            id: row.owner_id,
            fullName: row.owner_full_name,
            username: row.owner_username,
          }
        : null,
    };
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160);
  }
}
