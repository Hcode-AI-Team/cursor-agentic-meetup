import { getLocaleText } from '@hed-hog/api-locale';
import { PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDashboardDTO, UpdateDashboardDTO } from './dto';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) {}
  async getAllDashboards(paginationParams) {
    const fields = ['slug']
    const OR = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    if (paginationParams.search) {
      OR.push({
        dashboard_locale: {
          some: {
            name: {
              contains: paginationParams.search,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    return this.paginationService.paginate(
      this.prismaService.dashboard,
      paginationParams,
      {
        include: {
          dashboard_locale: {
            include: {
              locale: true,
            },
          },
          dashboard_role: {
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
          },
        },
        where: {
          OR
        },
        orderBy: {
          id: 'desc',
        },
      },
      'dashboard',
    );
  }
 
  async getDashboard(id: number, locale: string) {
    const dashboard = await this.prismaService.dashboard.findUnique({
      where: { id },
      include: {
        dashboard_locale: {
          include: {
            locale: true,
          },
        },
        dashboard_role: {
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
        },
        dashboard_item: {
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
          },
        },
      },
    });

    if (!dashboard) {
      throw new NotFoundException(
        getLocaleText('dashboardNotFound', locale, 'Dashboard not found'),
      );
    }

    return dashboard;
  }
 
  async createDashboard(data: CreateDashboardDTO, locale: string) {
    const dashboard = await this.prismaService.dashboard.create({
      data: {
        slug: data.slug,
      },
    });

    if (data.locale) {
      for (const [localeCode, localeData] of Object.entries(data.locale)) {
        const localeRecord = await this.prismaService.locale.findFirst({
          where: { code: localeCode },
        });

        if (localeRecord) {
          await this.prismaService.dashboard_locale.create({
            data: {
              dashboard_id: dashboard.id,
              locale_id: localeRecord.id,
              name: localeData.name,
            },
          });
        }
      }
    }

    return this.getDashboard(dashboard.id, locale);
  }
 
  async updateDashboard(id: number, data: UpdateDashboardDTO, locale: string) {
    await this.prismaService.dashboard.update({
      where: { id },
      data: {
        slug: data.slug,
      },
    });

    if (data.locale) {
      await this.prismaService.dashboard_locale.deleteMany({
        where: { dashboard_id: id },
      });
      
      for (const [localeCode, localeData] of Object.entries(data.locale)) {
        const localeRecord = await this.prismaService.locale.findFirst({
          where: { code: localeCode },
        });

        if (localeRecord) {
          await this.prismaService.dashboard_locale.create({
            data: {
              dashboard_id: id,
              locale_id: localeRecord.id,
              name: localeData.name,
            },
          });
        }
      }
    }

    return this.getDashboard(id, locale);
  }
 
  async deleteDashboard(id: number, locale: string) {
    const dashboard = await this.prismaService.dashboard.findUnique({
      where: { id },
    });

    if (!dashboard) {
      throw new NotFoundException(
        getLocaleText('dashboardNotFound', locale, 'Dashboard not found'),
      );
    }

    await this.prismaService.dashboard.delete({
      where: { id },
    });
    return { success: true };
  }
}
