import { getLocaleText } from '@hed-hog/api-locale';
import { PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import type { Prisma, user_change_log } from '@hed-hog/api-prisma';
import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
    forwardRef,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ChallengeService } from '../challenge/challenge.service';
import { DeleteDTO } from '../dto/delete.dto';
import { FileService } from '../file/file.service';
import { IntegrationDeveloperApiService } from '../integration/services/integration-developer-api.service';
import { SecurityService } from '../security/security.service';
import { SettingService } from '../setting/setting.service';
import { USER_AVATAR_UPLOAD_DESTINATION } from './constants/user.constants';
import { CreateWithEmailAndPasswordDTO } from './dto/create-with-email-and-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { UpdateDTO } from './dto/update.dto';

// Constants
const IDENTIFIER_TYPE = {
  EMAIL: 'email',
} as const;

const CREDENTIAL_TYPE = {
  PASSWORD: 'password',
} as const;

const USER_AVATAR_CACHE_MAX_AGE_SETTING = 'user-avatar-cache-max-age';
const DEFAULT_ROLE_SLUG = 'user';
const DAYS_IN_MS = 24 * 60 * 60 * 1000;
const NEW_USERS_PERIOD_DAYS = 7;
const RANDOM_PASSWORD_LENGTH = 16;

const PASSWORD_CHARSETS = {
  lowercase: 'abcdefghijkmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  numbers: '23456789',
  symbols: '@#$%&*!?-_+',
} as const;

const USER_SORT_FIELDS = [
  'id',
  'name',
  'photo_id',
  'suspended_until',
  'suspended_reason',
  'deactivated_at',
  'created_at',
  'updated_at',
] as const;

const USER_SEARCH_FIELDS = ['name'] as const;

type UserChangeLog = user_change_log;
type UserChangeLogActor = Prisma.userGetPayload<{
  select: {
    id: true;
    name: true;
    user_identifier: {
      select: { value: true };
      take: 1;
    };
  };
}>;

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
    @Inject(forwardRef(() => SecurityService))
    private readonly security: SecurityService,
    @Inject(forwardRef(() => ChallengeService))
    private readonly challenge: ChallengeService,
    @Inject(forwardRef(() => FileService))
    private readonly file: FileService,
    @Inject(forwardRef(() => IntegrationDeveloperApiService))
    private readonly integrationApi: IntegrationDeveloperApiService,
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
  ) { }

  // ==========================================
  // Validation Helpers
  // ==========================================

  private async validateUserExists(locale: string, userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        getLocaleText('userNotFound', locale, 'User not found')
      );
    }

    return user;
  }

  private async validateRoleExists(locale: string, roleId: number) {
    const role = await this.prismaService.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(
        getLocaleText('roleNotFound', locale, 'Role not found')
      );
    }

    return role;
  }

  private async validateEmailAvailable(locale: string, email: string) {
    const existingUser = await this.findUserByEmail(locale, email);
    
    if (existingUser) {
      throw new BadRequestException(
        getLocaleText('signup.emailExists', locale, 'Email already in use.')
      );
    }
  }

  // ==========================================
  // User Identifier Methods
  // ==========================================

  async verifyIdentifier(locale: string, userId: number, identifierId: number) {
    const identifier = await this.prismaService.user_identifier.findFirst({
      where: {
        id: identifierId,
        user_id: userId,
      },
    });

    if (!identifier) {
      throw new NotFoundException(
        getLocaleText('userIdentifierNotFound', locale, 'Identifier not found for this user')
      );
    }

    return identifier;
  }

  // ==========================================
  // CRUD Operations
  // ==========================================

  async list(paginationParams) {
    const paginate = await this.paginationService.paginatePrismaModel(
      this.prismaService.user,
      {
        ...paginationParams,
        validSortFields: USER_SORT_FIELDS,
        searchFields: USER_SEARCH_FIELDS,
        include: this.getUserIncludeClause(),
      }
    );

    const stats = await this.getUserStatistics();

    return { paginate, stats };
  }

  async get(locale: string, userId: number) {
    return this.findUserById(locale, userId);
  }

  async createWithEmailAndPassword(
    locale: string,
    { email, name, password }: CreateWithEmailAndPasswordDTO,
  ) {
    await this.validateEmailAvailable(locale, email);

    const passwordHash = await this.security.hashArgon2(password);

    const user = await this.prismaService.$transaction(async (tx) => {
      const role = await this.getDefaultUserRole(locale, tx);

      const user = await tx.user.create({
        data: {
          name,
          user_identifier: {
            create: {
              type: IDENTIFIER_TYPE.EMAIL,
              value: email,
              enabled: true,
            },
          },
          user_credential: {
            create: {
              type: CREDENTIAL_TYPE.PASSWORD,
              hash: passwordHash,
            },
          },
          role_user: {
            create: {
              role_id: role.id,
            },
          },
        },
      });

      return user;
    });

    const challenge = await this.challenge.verifyEmail(locale, user.id, email);
    await this.registerUserActivity(user.id, 'register');

    await this.integrationApi.publishEvent({
      eventName: 'core.user.created',
      sourceModule: 'core',
      aggregateType: 'user',
      aggregateId: String(user.id),
      payload: { id: user.id, name: user.name, email },
    }).catch(() => null);

    return { user, challenge };
  }

  async update(
    locale: string,
    userId: number,
    { name }: UpdateDTO,
    actorUserId?: number,
  ) {
    const user = await this.findUserById(locale, userId);

    const result = await this.prismaService.user.update({
      where: { id: user.id },
      data: { name: name ?? user.name },
    });

    if (result.name !== user.name) {
      await this.recordUserChange({
        targetUserId: userId,
        actorUserId,
        action: 'update',
        summary: `name: "${user.name ?? ''}" → "${result.name ?? ''}"`,
        beforeData: { name: user.name },
        afterData: { name: result.name },
      });
    }

    await this.integrationApi.publishEvent({
      eventName: 'core.user.updated',
      sourceModule: 'core',
      aggregateType: 'user',
      aggregateId: String(userId),
      payload: { id: userId, name: result.name },
    }).catch(() => null);

    return result;
  }

  async resetPassword(
    locale: string,
    userId: number,
    { password }: ResetPasswordDTO,
    actorUserId?: number,
  ) {
    await this.validateUserExists(locale, userId);

    const nextPassword = password || this.generateRandomPassword();
    const passwordHash = await this.security.hashArgon2(nextPassword);

    const updateResult = await this.prismaService.user_credential.updateMany({
      where: {
        user_id: userId,
        type: CREDENTIAL_TYPE.PASSWORD,
      },
      data: {
        hash: passwordHash,
        requires_reset: true,
      },
    });

    if (updateResult.count === 0) {
      await this.prismaService.user_credential.create({
        data: {
          user_id: userId,
          type: CREDENTIAL_TYPE.PASSWORD,
          hash: passwordHash,
          requires_reset: true,
        },
      });
    }

    await this.registerUserActivity(userId, 'resetPassword');

    await this.recordUserChange({
      targetUserId: userId,
      actorUserId,
      action: 'reset_password',
      summary: 'Password reset and flagged for required change on next login',
    });

    return {
      password: nextPassword,
      requiresReset: true,
    };
  }

  async delete(locale: string, { ids }: DeleteDTO) {
    this.validateDeleteIds(locale, ids);

    const usersExists = await this.prismaService.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (usersExists.length !== ids.length) {
      throw new NotFoundException(
        getLocaleText('userNotFound', locale, 'One or more users not found')
      );
    }

    const result = await this.prismaService.user.deleteMany({
      where: { id: { in: ids } },
    });

    await this.integrationApi.publishEvent({
      eventName: 'core.user.deleted',
      sourceModule: 'core',
      aggregateType: 'user',
      aggregateId: ids.join(','),
      payload: { ids },
    }).catch(() => null);

    return result;
  }

  // ==========================================
  // Avatar Management
  // ==========================================

  async changeAvatar(
    locale: string,
    userId: number,
    avatar: MulterFile,
    actorUserId?: number,
  ) {
    const user = await this.validateUserExists(locale, userId);

    const newFile = await this.file.upload(USER_AVATAR_UPLOAD_DESTINATION, avatar);

    await this.deleteOldAvatar(locale, user.photo_id);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { photo_id: newFile.id },
    });

    await this.recordUserChange({
      targetUserId: userId,
      actorUserId,
      action: 'avatar_changed',
      summary: 'Avatar updated',
      beforeData: { photo_id: user.photo_id },
      afterData: { photo_id: newFile.id },
    });

    return {
      id: newFile.id,
      path: newFile.path,
    };
  }

  async openPublicAvatar(locale: string, fileId: number, ifNoneMatch: string | undefined, res: any) {
    const userWithAvatar = await this.prismaService.user.findFirst({
      where: {
        photo_id: fileId,
      },
      select: {
        id: true,
      },
    });

    if (!userWithAvatar) {
      throw new NotFoundException(
        getLocaleText('userNotFound', locale, 'User not found')
      );
    }

    const { file, buffer } = await this.file.getBuffer(fileId);

    const etag = `"${createHash('md5').update(buffer).digest('hex')}"`;

    if (ifNoneMatch === etag) {
      res.status(304).send();
      return;
    }

    const settings = await this.settingService.getSettingValues(
      USER_AVATAR_CACHE_MAX_AGE_SETTING,
    );
    const maxAge = Number(settings[USER_AVATAR_CACHE_MAX_AGE_SETTING] ?? 3600);

    res.set({
      'Content-Type': file.file_mimetype.name,
      'Content-Length': buffer.length,
      'Cache-Control': `public, max-age=${maxAge}`,
      'ETag': etag,
    });

    res.send(buffer);
  }

  // ==========================================
  // User Lookup Methods
  // ==========================================

  async findUserById(locale: string, id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        user_identifier: true,
        user_credential: true,
        user_activity: true,
        user_session: true,
        user_account: true,
         role_user: {
           include: {
             role: true,
           },
         },
      },
    });

    if (!user) {
      throw new NotFoundException(
        getLocaleText('userNotFound', locale, 'User not found')
      );
    }

    return user;
  }

  async findUserByEmail(_locale: string, email: string) {
    return this.prismaService.user.findFirst({
      where: {
        user_identifier: {
          some: {
            type: IDENTIFIER_TYPE.EMAIL,
            value: email.toLowerCase().trim(),
            enabled: true,
          },
        },
      },
      include: {
        user_identifier: true,
        user_credential: true,
        user_session: true,
      },
    });
  }

  // ==========================================
  // Role Management
  // ==========================================

  async getUserRoles(locale: string, userId: number) {
    const [allRoles, userRoles] = await Promise.all([
      this.getAllRolesWithLocale(),
      this.getUserAssignedRoles(userId),
    ]);

    return this.mapRolesWithAssignment(locale, allRoles, userRoles);
  }

  async getUserMenus(locale: string, userId: number) {
    const roleUsers = await this.prismaService.role_user.findMany({
      where: { user_id: userId },
      select: { role_id: true },
    });
    const roleIds = roleUsers.map((ru) => ru.role_id);

    const menus = await this.prismaService.menu.findMany({
      where: {
        role_menu: {
          some: { role_id: { in: roleIds } },
        },
      },
      include: {
        menu_locale: {
          where: { locale: { code: locale } },
          select: { name: true },
        },
        role_menu: {
          where: { role_id: { in: roleIds } },
          include: {
            role: {
              select: {
                slug: true,
                role_locale: {
                  where: { locale: { code: locale } },
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    return menus.map((menu) => ({
      id: menu.id,
      menuId: (menu as any).menu_id ?? null,
      url: (menu as any).url,
      icon: (menu as any).icon,
      order: (menu as any).order,
      name: (menu as any).menu_locale?.[0]?.name || (menu as any).url || '',
      roles: ((menu as any).role_menu ?? []).map((rm: any) => ({
        name: rm.role?.role_locale?.[0]?.name ?? rm.role?.slug ?? '',
        slug: rm.role?.slug ?? '',
      })),
    }));
  }

  async getUserRoutes(locale: string, userId: number) {
    const roleUsers = await this.prismaService.role_user.findMany({
      where: { user_id: userId },
      select: { role_id: true },
    });
    const roleIds = roleUsers.map((ru) => ru.role_id);

    const routes = await this.prismaService.route.findMany({
      where: {
        role_route: {
          some: { role_id: { in: roleIds } },
        },
      },
      include: {
        role_route: {
          where: { role_id: { in: roleIds } },
          include: {
            role: {
              select: {
                slug: true,
                role_locale: {
                  where: { locale: { code: locale } },
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ method: 'asc' }, { url: 'asc' }],
    });

    return routes.map((route) => ({
      id: route.id,
      url: route.url,
      method: route.method,
      roles: ((route as any).role_route ?? []).map((rr: any) => ({
        name: rr.role?.role_locale?.[0]?.name ?? rr.role?.slug ?? '',
        slug: rr.role?.slug ?? '',
      })),
    }));
  }

  async assignRoleToUser(
    locale: string,
    userId: number,
    roleId: number,
    actorUserId?: number,
  ) {
    const [, role] = await Promise.all([
      this.validateUserExists(locale, userId),
      this.validateRoleExists(locale, roleId),
    ]);

    const existingRoleUser = await this.findRoleUser(userId, roleId);

    if (existingRoleUser) {
      return existingRoleUser;
    }

    const result = await this.prismaService.role_user.create({
      data: {
        user_id: userId,
        role_id: roleId,
      },
    });

    await this.recordUserChange({
      targetUserId: userId,
      actorUserId,
      action: 'role_assigned',
      summary: `Role assigned: ${role.slug}`,
      afterData: { role_id: roleId, slug: role.slug },
    });

    return result;
  }

  async removeRoleFromUser(
    locale: string,
    userId: number,
    roleId: number,
    actorUserId?: number,
  ) {
    const [, role] = await Promise.all([
      this.validateUserExists(locale, userId),
      this.validateRoleExists(locale, roleId),
    ]);

    const roleUser = await this.findRoleUser(userId, roleId);

    if (!roleUser) {
      return { count: 0 };
    }

    await this.prismaService.role_user.delete({
      where: { id: roleUser.id },
    });

    await this.recordUserChange({
      targetUserId: userId,
      actorUserId,
      action: 'role_removed',
      summary: `Role removed: ${role.slug}`,
      beforeData: { role_id: roleId, slug: role.slug },
    });

    return { count: 1 };
  }

  // ==========================================
  // Activity Tracking
  // ==========================================

  async registerUserActivity(userId: number | null | undefined, action: string) {
    if (!userId || !Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    return this.prismaService.user_activity.create({
      data: {
        user_id: userId,
        action,
      },
    });
  }

  // ==========================================
  // Change Log (administrative audit trail)
  // ==========================================

  private async recordUserChange(data: {
    targetUserId: number;
    actorUserId?: number | null;
    action: string;
    summary?: string;
    beforeData?: unknown;
    afterData?: unknown;
  }) {
    return this.prismaService.user_change_log
      .create({
        data: {
          target_user_id: data.targetUserId,
          actor_user_id: data.actorUserId ?? null,
          action: data.action,
          summary: data.summary ?? null,
          before_data:
            data.beforeData === undefined
              ? null
              : JSON.stringify(data.beforeData),
          after_data:
            data.afterData === undefined
              ? null
              : JSON.stringify(data.afterData),
        },
      })
      .catch(() => null);
  }

  async listUserChangeLogs(locale: string, userId: number, paginationParams) {
    await this.validateUserExists(locale, userId);

    const paginated = await this.paginationService.paginatePrismaModel(
      this.prismaService.user_change_log,
      {
        page: paginationParams?.page,
        pageSize: paginationParams?.pageSize,
        sortField: paginationParams?.sortField || 'created_at',
        sortOrder: paginationParams?.sortOrder || 'desc',
        validSortFields: ['id', 'created_at', 'action'],
        where: { target_user_id: userId },
      },
    );

    const logs = (paginated.data || []) as UserChangeLog[];
    const actorIds = [
      ...new Set(
        logs
          .map((log) => log.actor_user_id)
          .filter((id): id is number => Boolean(id)),
      ),
    ];

    const actors: UserChangeLogActor[] = actorIds.length
      ? await this.prismaService.user.findMany({
          where: { id: { in: actorIds } },
          select: {
            id: true,
            name: true,
            user_identifier: {
              where: { type: IDENTIFIER_TYPE.EMAIL, enabled: true },
              select: { value: true },
              take: 1,
            },
          },
        })
      : [];

    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    return {
      ...paginated,
      data: logs.map((log) => {
        const actor = log.actor_user_id
          ? actorMap.get(log.actor_user_id)
          : null;

        return {
          id: String(log.id),
          actorUserId: log.actor_user_id ? String(log.actor_user_id) : null,
          actorName: actor?.name ?? null,
          actorEmail: actor?.user_identifier?.[0]?.value ?? null,
          action: log.action,
          summary: log.summary || '',
          beforeData: log.before_data || '',
          afterData: log.after_data || '',
          ipAddress: log.ip_address || '',
          createdAt: log.created_at?.toISOString?.() || null,
        };
      }),
    };
  }

  async listUserActivities(locale: string, userId: number, paginationParams) {
    await this.validateUserExists(locale, userId);

    const paginated = await this.paginationService.paginatePrismaModel(
      this.prismaService.user_activity,
      {
        page: paginationParams?.page,
        pageSize: paginationParams?.pageSize,
        sortField: paginationParams?.sortField || 'created_at',
        sortOrder: paginationParams?.sortOrder || 'desc',
        validSortFields: ['id', 'created_at', 'action'],
        where: { user_id: userId },
      },
    );

    return {
      ...paginated,
      data: (paginated.data || []).map((activity: any) => ({
        id: String(activity.id),
        action: activity.action,
        createdAt: activity.created_at?.toISOString?.() || null,
      })),
    };
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private validateDeleteIds(locale: string, ids: number[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException(
        getLocaleText(
          'userIdsRequired',
          locale,
          'At least one User ID is required to delete users.'
        )
      );
    }
  }

  private async deleteOldAvatar(locale: string, photoId: number) {
    if (photoId > 0) {
      try {
        await this.file.delete(locale, { ids: [photoId] });
      } catch (error) {
        // Fallback: delete directly from database if file service fails
        await this.prismaService.file.delete({
          where: { id: photoId },
        }).catch(() => {
          console.warn('Failed to delete old avatar:', error);
        });
      }
    }
  }

  private async getDefaultUserRole(locale: string, tx: any) {
    const role = await tx.role.findFirst({
      where: { slug: DEFAULT_ROLE_SLUG },
      select: { id: true },
    });

    if (!role) {
      throw new BadRequestException(
        getLocaleText(
          'defaultRoleNotFound',
          locale,
          'Default user role not found.'
        )
      );
    }

    return role;
  }

  private generateRandomPassword(length = RANDOM_PASSWORD_LENGTH) {
    const cryptoObj = globalThis.crypto;
    const groups = [
      PASSWORD_CHARSETS.lowercase,
      PASSWORD_CHARSETS.uppercase,
      PASSWORD_CHARSETS.numbers,
      PASSWORD_CHARSETS.symbols,
    ];

    const allChars = groups.join('');
    const values = new Uint32Array(length + groups.length);
    cryptoObj.getRandomValues(values);

    const passwordChars: string[] = [];

    groups.forEach((group, index) => {
      const randomIndex = values[index] % group.length;
      passwordChars.push(group[randomIndex]);
    });

    for (let i = groups.length; i < values.length; i++) {
      const randomIndex = values[i] % allChars.length;
      passwordChars.push(allChars[randomIndex]);
    }

    for (let i = passwordChars.length - 1; i > 0; i--) {
      const randomIndex = values[i] % (i + 1);
      const temp = passwordChars[i];
      passwordChars[i] = passwordChars[randomIndex];
      passwordChars[randomIndex] = temp;
    }

    return passwordChars.slice(0, length).join('');
  }

  private getUserIncludeClause() {
    return {
      user_account: true,
      user_credential: true,
      user_identifier: {
        where: { enabled: true },
      },
      user_mfa: {
        where: { verified_at: { not: null } },
      },
      user_activity: {
        orderBy: { created_at: 'desc' },
      },
      user_session: {
        where: {
          revoked_at: null,
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      },
    };
  }

  private async getUserStatistics() {
    const sevenDaysAgo = new Date(Date.now() - NEW_USERS_PERIOD_DAYS * DAYS_IN_MS);
    const now = new Date();

    const [totalUsers, newUsersLast7Days, blockedUsers] =
      await this.prismaService.$transaction([
        this.prismaService.user.count(),
        this.prismaService.user.count({
          where: { created_at: { gte: sevenDaysAgo } },
        }),
        this.prismaService.user.count({
          where: { suspended_until: { gt: now } },
        }),
      ]);

    return {
      total: totalUsers,
      newLast7Days: newUsersLast7Days,
      blocked: blockedUsers,
    };
  }

  private async getAllRolesWithLocale() {
    return this.prismaService.role.findMany({
      include: {
        role_locale: {
          include: { locale: true },
        },
      },
    });
  }

  private async getUserAssignedRoles(userId: number) {
    return this.prismaService.role_user.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            role_locale: {
              include: { locale: true },
            },
          },
        },
      },
    });
  }

  private mapRolesWithAssignment(
    locale: string,
    allRoles: any[],
    userRoles: any[],
  ) {
    return allRoles.map((role) => {
      const isAssigned = userRoles.some(
        (userRole) => userRole.role_id === role.id
      );

      const localeData =
        role.role_locale.find((roleLocale) => roleLocale.locale.code === locale) ??
        role.role_locale[0];

      return {
        id: role.id,
        slug: role.slug,
        name: localeData?.name || '',
        description: localeData?.description || '',
        isAssigned,
      };
    });
  }

  private async findRoleUser(userId: number, roleId: number) {
    return this.prismaService.role_user.findFirst({
      where: {
        user_id: userId,
        role_id: roleId,
      },
    });
  }
}
