import { getLocaleText } from '@hed-hog/api-locale';
import { PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    CreateDashboardRoleBatchDTO,
    CreateDashboardRoleDTO,
} from './dto';

@Injectable()
export class DashboardRoleService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) {}

  async getAll(paginationParams) {
    return this.paginationService.paginate(
      this.prismaService.dashboard_role,
      paginationParams,
      {
        include: {
          dashboard: {
            include: {
              dashboard_locale: {
                include: {
                  locale: true,
                },
              },
            },
          },
          role: {
            include: {
              role_locale: {
                include: {
                  locale: true,
                },
              },
            },
          },
        },
        orderBy: {
          id: 'desc',
        },
      },
      'dashboardRole',
    );
  }

  async getAllByDashboard(dashboardId: number) {
    const relations = await this.prismaService.dashboard_role.findMany({
      where: { dashboard_id: dashboardId },
      include: {
        role: {
          include: {
            role_locale: {
              include: {
                locale: true,
              },
            },
          },
        },
      },
    });

    return relations;
  }

  async create(data: CreateDashboardRoleDTO, locale: string) {
    const existing = await this.prismaService.dashboard_role.findFirst({
      where: {
        dashboard_id: data.dashboard_id,
        role_id: data.role_id,
      },
    });

    if (existing) {
      throw new Error(
        getLocaleText(
          'dashboardRoleAlreadyExists',
          locale,
          'Dashboard role already exists',
        ),
      );
    }

    return this.prismaService.dashboard_role.create({
      data: {
        dashboard_id: data.dashboard_id,
        role_id: data.role_id,
      },
      include: {
        dashboard: {
          include: {
            dashboard_locale: {
              include: {
                locale: true,
              },
            },
          },
        },
        role: {
          include: {
            role_locale: {
              include: {
                locale: true,
              },
            },
          },
        },
      },
    });
  }

  async createBatch(data: CreateDashboardRoleBatchDTO, locale: string) {
    const uniqueRoleIds = [...new Set(data.role_ids)];

    const existingRelations = await this.prismaService.dashboard_role.findMany({
      where: {
        dashboard_id: data.dashboard_id,
        role_id: {
          in: uniqueRoleIds,
        },
      },
      select: {
        role_id: true,
      },
    });

    const existingRoleIds = new Set(existingRelations.map((item) => item.role_id));
    const roleIdsToCreate = uniqueRoleIds.filter((roleId) => !existingRoleIds.has(roleId));

    if (roleIdsToCreate.length > 0) {
      await this.prismaService.dashboard_role.createMany({
        data: roleIdsToCreate.map((roleId) => ({
          dashboard_id: data.dashboard_id,
          role_id: roleId,
        })),
        skipDuplicates: true,
      });
    }

    return {
      success: true,
      created: roleIdsToCreate.length,
      skipped: uniqueRoleIds.length - roleIdsToCreate.length,
      message: getLocaleText(
        'dashboardRoleBatchCreated',
        locale,
        'Dashboard roles processed successfully',
      ),
    };
  }

  async delete(id: number, locale: string) {
    const relation = await this.prismaService.dashboard_role.findUnique({ where: { id } });

    if (!relation) {
      throw new NotFoundException(
        getLocaleText(
          'dashboardRoleNotFound',
          locale,
          'Dashboard role not found',
        ),
      );
    }

    await this.prismaService.dashboard_role.delete({ where: { id } });
    return { success: true };
  }

  async deleteByDashboardAndRole(
    dashboardId: number,
    roleId: number,
    locale: string,
  ) {
    const relation = await this.prismaService.dashboard_role.findFirst({
      where: {
        dashboard_id: dashboardId,
        role_id: roleId,
      },
    });

    if (!relation) {
      throw new NotFoundException(
        getLocaleText(
          'dashboardRoleNotFound',
          locale,
          'Dashboard role not found',
        ),
      );
    }

    await this.prismaService.dashboard_role.delete({ where: { id: relation.id } });
    return { success: true };
  }
}
