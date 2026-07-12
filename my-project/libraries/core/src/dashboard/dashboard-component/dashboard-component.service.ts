import { getLocaleText } from '@hed-hog/api-locale';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
    BadRequestException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { existsSync, promises as fs } from 'fs';
import { join, resolve } from 'path';
import {
    CreateDashboardComponentDTO,
    UpdateDashboardComponentDTO,
} from './dto';
type DashboardComponentUserPagination = PaginationDTO & {
  librarySlug?: string;
  exclude?: string;
};

@Injectable()
export class DashboardComponentService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) {}

  async getAllComponents(paginationParams: PaginationDTO) {
    const fields = ['slug', 'library_slug']
    const OR = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    if (paginationParams.search) {
      OR.push({
        dashboard_component_locale: {
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
      this.prismaService.dashboard_component,
      paginationParams,
      {
        include: {
          dashboard_component_locale: {
            include: {
              locale: true,
            },
          },
          dashboard_component_role: {
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
          OR,
        },
        orderBy: {
          created_at: 'desc',
        },
      },
      'dashboardComponent',
    );
  }

  async getAllComponentsByUserRole(
    paginationParams: DashboardComponentUserPagination,
    userId: number,
  ) {
    const userRoles = await this.prismaService.role_user.findMany({
      where: { user_id: userId },
      select: { role_id: true },
    });

    const userRoleIds = userRoles.map((ur) => ur.role_id);

    if (userRoleIds.length === 0) {
      const emptyResult = await this.paginationService.paginate(
        this.prismaService.dashboard_component,
        paginationParams,
        {
          include: {
            dashboard_component_locale: {
              include: {
                locale: true,
              },
            },
            dashboard_component_role: {
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
            id: -1,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        'dashboardComponent',
      );

      return {
        ...emptyResult,
        modules: [],
      };
    }

    const requestedLibrarySlug = paginationParams.librarySlug?.trim();
    const excludedComponents = (paginationParams.exclude ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const slugParts = value.split('.').filter(Boolean);
        const baseSlug = slugParts[slugParts.length - 1] || value;
        const librarySlug = slugParts.length > 1 ? slugParts[0] : undefined;

        return {
          slug: baseSlug,
          ...(librarySlug ? { library_slug: librarySlug } : {}),
        };
      });

    const fields = ['slug', 'library_slug'];
    const OR = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    if (paginationParams.search) {
      OR.push({
        dashboard_component_locale: {
          some: {
            name: {
              contains: paginationParams.search,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    const baseFilters = [
      {
        dashboard_component_role: {
          some: {
            role_id: {
              in: userRoleIds,
            },
          },
        },
      },
      ...(OR.length > 0 ? [{ OR }] : []),
      ...(excludedComponents.length > 0
        ? [
            {
              NOT: {
                OR: excludedComponents,
              },
            },
          ]
        : []),
    ];

    const [paginatedResult, modules] = await Promise.all([
      this.paginationService.paginate(
        this.prismaService.dashboard_component,
        paginationParams,
        {
          include: {
            dashboard_component_locale: {
              include: {
                locale: true,
              },
            },
            dashboard_component_role: {
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
            AND: [
              ...baseFilters,
              ...(requestedLibrarySlug
                ? [{ library_slug: requestedLibrarySlug }]
                : []),
            ],
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        'dashboardComponent',
      ),
      this.prismaService.dashboard_component.findMany({
        where: {
          AND: baseFilters,
        },
        select: {
          library_slug: true,
        },
        distinct: ['library_slug'],
        orderBy: {
          library_slug: 'asc',
        },
      }),
    ]);

    return {
      ...paginatedResult,
      modules: modules
        .map((component) => component.library_slug)
        .filter((value): value is string => Boolean(value)),
    };
  }

  async getComponent(id: number, locale: string, userId?: number) {
    if (userId) {
      const userRoles = await this.prismaService.role_user.findMany({
        where: { user_id: userId },
        select: { role_id: true },
      });

      const userRoleIds = userRoles.map((ur) => ur.role_id);
      const component = await this.prismaService.dashboard_component.findFirst({
        where: {
          id,
          dashboard_component_role: {
            some: {
              role_id: {
                in: userRoleIds,
              },
            },
          },
        },
        include: {
          dashboard_component_locale: {
            include: {
              locale: true,
            },
          },
        },
      });

      if (!component) {
        throw new NotFoundException(
          getLocaleText('dashboardComponentNotFound', locale, 'Dashboard component not found'),
        );
      }

      return component;
    }

    const component = await this.prismaService.dashboard_component.findUnique({
      where: { id },
      include: {
        dashboard_component_locale: {
          include: {
            locale: true,
          },
        },
        dashboard_component_role: {
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
    });

    if (!component) {
      throw new NotFoundException(
        getLocaleText('dashboardComponentNotFound', locale, 'Dashboard component not found'),
      );
    }

    return component;
  }

  async createComponent(data: CreateDashboardComponentDTO, locale: string) {
    const normalized = this.normalizeComponentIdentity(
      data.slug,
      data.library_slug,
    );

    const component = await this.prismaService.dashboard_component.create({
      data: {
        slug: normalized.slug,
        library_slug: normalized.library_slug,
        min_width: data.min_width,
        max_width: data.max_width,
        min_height: data.min_height,
        max_height: data.max_height,
        width: data.width,
        height: data.height,
        is_resizable: data.is_resizable ?? true,
      },
    });

    if (data.locale) {
      for (const [localeCode, localeData] of Object.entries(data.locale)) {
        const localeRecord = await this.prismaService.locale.findFirst({
          where: { code: localeCode },
        });

        if (localeRecord) {
          await this.prismaService.dashboard_component_locale.create({
            data: {
              dashboard_component_id: component.id,
              locale_id: localeRecord.id,
              name: localeData.name,
              description: localeData.description || '',
            },
          });
        }
      }
    }

    return this.getComponent(component.id, locale);
  }

  async updateComponent(id: number, data: UpdateDashboardComponentDTO, locale: string) {
    const normalized = data.slug
      ? this.normalizeComponentIdentity(data.slug, data.library_slug)
      : {
          slug: undefined,
          library_slug: data.library_slug,
        };

   await this.prismaService.dashboard_component.update({
      where: { id },
      data: {
        slug: normalized.slug,
        library_slug: normalized.library_slug,
        min_width: data.min_width,
        max_width: data.max_width,
        min_height: data.min_height,
        max_height: data.max_height,
        width: data.width,
        height: data.height,
        is_resizable: data.is_resizable,
      },
    });

    if (data.locale) {
      await this.prismaService.dashboard_component_locale.deleteMany({
        where: { dashboard_component_id: id },
      });

      for (const [localeCode, localeData] of Object.entries(data.locale)) {
        const localeRecord = await this.prismaService.locale.findFirst({
          where: { code: localeCode },
        });

        if (localeRecord) {
          await this.prismaService.dashboard_component_locale.create({
            data: {
              dashboard_component_id: id,
              locale_id: localeRecord.id,
              name: localeData.name,
              description: localeData.description || '',
            },
          });
        }
      }
    }

    return this.getComponent(id, locale);
  }

  async deleteComponent(id: number, locale: string) {
    const component = await this.prismaService.dashboard_component.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException(
        getLocaleText('dashboardComponentNotFound', locale, 'Dashboard component not found'),
      );
    }

    return this.prismaService.dashboard_component.delete({
      where: { id },
    });
  }

  private normalizeComponentIdentity(slug: string, librarySlug?: string | null) {
    const slugParts = slug.split('.').filter(Boolean);
    const baseSlug =
      slugParts.length > 0 ? slugParts[slugParts.length - 1]! : slug;
    const resolvedLibrarySlug =
      librarySlug || (slugParts.length > 1 ? slugParts[0]! : 'core');

    return {
      slug: baseSlug,
      library_slug: resolvedLibrarySlug,
    };
  }

  private buildWidgetAssetSlug(slug: string, librarySlug?: string | null) {
    const normalized = this.normalizeComponentIdentity(slug, librarySlug);

    return normalized.slug;
  }

  private resolvePreviewDirectory(): string {
    const cwd = process.cwd();
    const candidates = [
      resolve(cwd, 'libraries/core/hedhog/frontend/public/dashboard-previews'),
      resolve(cwd, '../libraries/core/hedhog/frontend/public/dashboard-previews'),
      resolve(cwd, '../../libraries/core/hedhog/frontend/public/dashboard-previews'),
    ];

    for (const candidate of candidates) {
      const parentDirectory = resolve(candidate, '..');
      if (existsSync(parentDirectory)) {
        return candidate;
      }
    }

    return candidates[0];
  }

  async savePreview(id: number, file: MulterFile, locale: string) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!isDevelopment) {
      throw new ForbiddenException(
        getLocaleText('dashboardPreviewOnlyInDevelopment', locale, 'Preview capture is only available in development environment'),
      );
    }

    if (!file || !file.buffer) {
      throw new BadRequestException(
        getLocaleText('dashboardPreviewFileRequired', locale, 'Preview image file is required'),
      );
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        getLocaleText('dashboardPreviewInvalidFileType', locale, 'Preview file must be an image'),
      );
    }

    const component = await this.prismaService.dashboard_component.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        library_slug: true,
      },
    });

    if (!component) {
      throw new NotFoundException(
        getLocaleText('dashboardComponentNotFound', locale, 'Dashboard component not found'),
      );
    }

    const previewDirectory = this.resolvePreviewDirectory();
    await fs.mkdir(previewDirectory, { recursive: true });

    const assetSlug = this.buildWidgetAssetSlug(
      component.slug,
      component.library_slug,
    );
    const fileName = `${assetSlug}.png`;
    const outputPath = join(previewDirectory, fileName);
    await fs.writeFile(outputPath, file.buffer);

    return {
      success: true,
      componentId: component.id,
      slug: component.slug,
      library_slug: component.library_slug,
      fileName,
      relativeUrl: `/libraries/${component.library_slug}/dashboard-previews/${fileName}`,
    };
  }
}
