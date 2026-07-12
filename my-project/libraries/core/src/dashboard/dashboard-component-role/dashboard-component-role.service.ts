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
    CreateDashboardComponentRoleBatchDTO,
    CreateDashboardComponentRoleDTO,
} from './dto';

@Injectable()
export class DashboardComponentRoleService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) {}

  async getAll(paginationParams, locale: string) {
    return this.paginationService.paginate(
      this.prismaService.dashboard_component_role,
      paginationParams,
      {
        include: {
          dashboard_component: {
            include: {
              dashboard_component_locale: {
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
      'dashboardComponentRole',
    );
  }

  async getAllByComponent(componentId: number, locale: string) {
    const relations = await this.prismaService.dashboard_component_role.findMany({
      where: { component_id: componentId },
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

  async create(data: CreateDashboardComponentRoleDTO, locale: string) {
    // Verificar se a relação já existe
    const existing = await this.prismaService.dashboard_component_role.findFirst({
      where: {
        component_id: data.component_id,
        role_id: data.role_id,
      },
    });

    if (existing) {
      throw new Error(
        getLocaleText(
          'dashboardComponentRoleAlreadyExists',
          locale,
          'Dashboard component role already exists',
        ),
      );
    }

    return this.prismaService.dashboard_component_role.create({
      data: {
        component_id: data.component_id,
        role_id: data.role_id,
      },
      include: {
        dashboard_component: {
          include: {
            dashboard_component_locale: {
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

  async createBatch(data: CreateDashboardComponentRoleBatchDTO, locale: string) {
    const uniqueRoleIds = [...new Set(data.role_ids)];

    const existingRelations = await this.prismaService.dashboard_component_role.findMany({
      where: {
        component_id: data.component_id,
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
      await this.prismaService.dashboard_component_role.createMany({
        data: roleIdsToCreate.map((roleId) => ({
          component_id: data.component_id,
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
        'dashboardComponentRoleBatchCreated',
        locale,
        'Dashboard component roles processed successfully',
      ),
    };
  }

  async delete(id: number, locale: string) {
    const relation = await this.prismaService.dashboard_component_role.findUnique({
      where: { id },
    });

    if (!relation) {
      throw new NotFoundException(
        getLocaleText(
          'dashboardComponentRoleNotFound',
          locale,
          'Dashboard component role not found',
        ),
      );
    }

    await this.prismaService.dashboard_component_role.delete({
      where: { id },
    });

    return { success: true };
  }

  async deleteByComponentAndRole(
    componentId: number,
    roleId: number,
    locale: string,
  ) {
    const relation = await this.prismaService.dashboard_component_role.findFirst({
      where: {
        component_id: componentId,
        role_id: roleId,
      },
    });

    if (!relation) {
      throw new NotFoundException(
        getLocaleText(
          'dashboardComponentRoleNotFound',
          locale,
          'Dashboard component role not found',
        ),
      );
    }

    await this.prismaService.dashboard_component_role.delete({
      where: { id: relation.id },
    });

    return { success: true };
  }
}
