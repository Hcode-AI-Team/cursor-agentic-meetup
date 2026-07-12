import { LocaleService, getLocaleText } from '@hed-hog/api-locale';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
    forwardRef,
} from '@nestjs/common';
import { DeleteDTO } from '../dto/delete.dto';
import { UpdateIdsDTO } from '../dto/update-ids.dto';
import { IntegrationDeveloperApiService } from '../integration/services/integration-developer-api.service';
import { CreateDTO } from './dto/create.dto';
import { UpdateDTO } from './dto/update.dto';

@Injectable()
export class RoleService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
    @Inject(forwardRef(() => LocaleService))
    private readonly localeService: LocaleService,
    @Inject(forwardRef(() => IntegrationDeveloperApiService))
    private readonly integrationApi: IntegrationDeveloperApiService,
  ) {}

  async updateUsers(roleId: number, { ids }: UpdateIdsDTO):Promise<{count:number}> {
    await this.prismaService.role_user.deleteMany({
      where: {
        role_id: roleId,
      },
    });

    return this.prismaService.role_user.createMany({
      data: ids.map((userId) => ({
        role_id: roleId,
        user_id: userId,
      })),
      skipDuplicates: true,
    });
  }

  async updateScreens(roleId: number, data: UpdateIdsDTO):Promise<{count:number}> {
    await this.prismaService.role_screen.deleteMany({
      where: {
        role_id: roleId,
      },
    });

    return this.prismaService.role_screen.createMany({
      data: data.ids.map((screenId) => ({
        role_id: roleId,
        screen_id: screenId,
      })),
      skipDuplicates: true,
    });
  }

  async updateRoutes(roleId: number, data: UpdateIdsDTO):Promise<{count:number}> {
    await this.prismaService.role_route.deleteMany({
      where: {
        role_id: roleId,
      },
    });

    return this.prismaService.role_route.createMany({
      data: data.ids.map((routeId) => ({
        role_id: roleId,
        route_id: routeId,
      })),
      skipDuplicates: true,
    });
  }

  async updateMenus(roleId: number, data: UpdateIdsDTO):Promise<{count:number}> {
    await this.prismaService.role_menu.deleteMany({
      where: {
        role_id: roleId,
      },
    });

    return this.prismaService.role_menu.createMany({
      data: data.ids.map((menuId) => ({
        role_id: roleId,
        menu_id: menuId,
      })),
      skipDuplicates: true,
    });
  }

  async listUsers(roleId: number, paginationParams: PaginationDTO) {
    return this.paginationService.paginate(
      this.prismaService.user,
      paginationParams,
      {
        include: {
          role_user: {
            where: {
              role_id: roleId,
            },
            select: {
              user_id: true,
              role_id: true,
            },
          },
        },
      },
    );
  }

  async listMenus(
    locale: string,
    roleId: number,
    paginationParams: PaginationDTO,
  ) {
    return this.paginationService.paginate(
      this.prismaService.menu,
      paginationParams,
      {
        include: {
          menu_locale: {
            where: {
              locale: {
                code: locale,
              },
            },
            select: {
              name: true,
            },
          },
          role_menu: {
            where: {
              role_id: roleId,
            },
            select: {
              menu_id: true,
              role_id: true,
            },
          },
        },
      },
      'menu_locale',
    );
  }

  async listRoutes(
    roleId: number,
    paginationParams: PaginationDTO,
    search?: string,
    searchType?: 'contains' | 'startsWith' | 'endsWith',
    method?: string,
  ) {
    const whereClause: any = {};

    // Filtro de busca por URL
    if (search) {
      if (searchType === 'startsWith') {
        whereClause.url = {
          startsWith: search,
        };
      } else if (searchType === 'endsWith') {
        whereClause.url = {
          endsWith: search,
        };
      } else {
        // contains (padrão)
        whereClause.url = {
          contains: search,
        };
      }
    }

    // Filtro por método HTTP
    if (method && method !== 'all') {
      whereClause.method = method;
    }

    return this.paginationService.paginate(
      this.prismaService.route,
      paginationParams,
      {
        where: whereClause,
        include: {
          role_route: {
            where: {
              role_id: roleId,
            },
            select: {
              route_id: true,
              role_id: true,
            },
          },
        },
      },
    );
  }

  async listScreens(
    locale: string,
    roleId: number,
    paginationParams: PaginationDTO,
  ) {
    return this.paginationService.paginate(
      this.prismaService.screen,
      paginationParams,
      {
        include: {
          screen_locale: {
            where: {
              locale: {
                code: locale,
              },
            },
            select: {
              name: true,
            },
          },
          role_screen: {
            where: {
              role_id: roleId,
            },
            select: {
              screen_id: true,
              role_id: true,
            },
          },
        },
      },
      'screen_locale',
    );
  }

   async list(paginationParams, locale: string) {
    const localeRecord = await this.localeService.getByCode(locale);
    if (!localeRecord) {
      throw new Error(getLocaleText('localeNotFound', locale, `Locale ${locale} not found`).replace('{{locale}}', locale));
    }
    const localeId = localeRecord.id;

    const searchRaw = (paginationParams.search ?? '').toString().trim();
    const hasSearch = searchRaw.length > 0;
    const like = `%${searchRaw.toLowerCase()}%`;

    const rowsQuery = hasSearch
      ? this.prismaService.$queryRaw`
      SELECT
        f.id AS role_id,
        f.slug,
        fl.locale_id,
        fl.name,
        fl.description,
        (
          SELECT json_agg(json_build_object('code', l.code, 'name', l.name))
          FROM role_locale fl2
          JOIN locale l ON l.id = fl2.locale_id
          WHERE fl2.role_id = f.id 
            AND l.enabled = true
            AND fl2.name IS NOT NULL 
            AND fl2.name != ''
            AND fl2.description IS NOT NULL 
            AND fl2.description != ''
        ) AS available_locales,
        (
          SELECT COUNT(*)::int
          FROM role_user ru
          WHERE ru.role_id = f.id
        ) AS user_count,
        (
          SELECT COUNT(*)::int
          FROM role_menu rm
          WHERE rm.role_id = f.id
        ) AS menu_count,
        (
          SELECT COUNT(*)::int
          FROM role_route rr
          WHERE rr.role_id = f.id
        ) AS route_count
      FROM role AS f
      JOIN role_locale AS fl
        ON fl.role_id = f.id
      WHERE fl.locale_id = ${localeId}
        AND (
        LOWER(fl.name) LIKE ${like}
        OR LOWER(fl.description) LIKE ${like}
        )
      ORDER BY f.id DESC
      LIMIT ${paginationParams.take}
      OFFSET ${paginationParams.skip}
      `
      : this.prismaService.$queryRaw`
      SELECT
        f.id AS role_id,
        f.slug,
        fl.locale_id,
        fl.name,
        fl.description,
        (
          SELECT json_agg(json_build_object('code', l.code, 'name', l.name))
          FROM role_locale fl2
          JOIN locale l ON l.id = fl2.locale_id
          WHERE fl2.role_id = f.id 
            AND l.enabled = true
            AND fl2.name IS NOT NULL 
            AND fl2.name != ''
            AND fl2.description IS NOT NULL 
            AND fl2.description != ''
        ) AS available_locales,
        (
          SELECT COUNT(*)::int
          FROM role_user ru
          WHERE ru.role_id = f.id
        ) AS user_count,
        (
          SELECT COUNT(*)::int
          FROM role_menu rm
          WHERE rm.role_id = f.id
        ) AS menu_count,
        (
          SELECT COUNT(*)::int
          FROM role_route rr
          WHERE rr.role_id = f.id
        ) AS route_count
      FROM role AS f
      JOIN role_locale AS fl
        ON fl.role_id = f.id
      WHERE fl.locale_id = ${localeId}
      ORDER BY f.id DESC
      LIMIT ${paginationParams.take}
      OFFSET ${paginationParams.skip}
      `;

    const countQuery = this.prismaService.role.count({
      where: {
        role_locale: { some: { locale_id: localeId } },
        ...(hasSearch && {
          OR: [
            { role_locale: { some: { locale_id: localeId, name: { contains: searchRaw, mode: 'insensitive' } } } },
            { role_locale: { some: { locale_id: localeId, description: { contains: searchRaw, mode: 'insensitive' } } } },
          ],
        }),
      },
    });

    const [rows, total] = await Promise.all([rowsQuery, countQuery]);
    const mappedRows = (rows as any[]).map((row) => ({
      ...row,
      available_locales: row.available_locales || [],
    }));

    const pageSize = paginationParams.take;
    const page = Math.floor(paginationParams.skip / pageSize) + 1;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const prev = page > 1 ? page - 1 : null;
    const next = page < lastPage ? page + 1 : null;

    return {
      data: mappedRows,
      total,
      page,
      pageSize,
      prev,
      next,
      lastPage,
    };
  }

  async get(roleId: number) {
    const role = await this.prismaService.role.findUnique({
      where: { id: roleId },
      include: {
        role_locale: {
          include: {
            locale: {
              select: { code: true },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const localeData = role.role_locale.reduce((acc, item) => {
      const localeCode = item.locale.code;
      acc[localeCode] = {
        name: item.name,
        description: item.description,
      };
      return acc;
    }, {} as Record<string, { name: string; description: string }>);

    return {
      ...role,
      locale: localeData,
    };
  }

  async create(body: CreateDTO) {
    const { locale, slug } = body;
    
    const role = await this.prismaService.role.create({
      data: { slug },
    });

    if (locale) {
      await Promise.all(
        Object.entries(locale).map(async ([localeCode, localeData]) => {
          const localeRecord = await this.localeService.getByCode(localeCode);
          
          await this.prismaService.role_locale.create({
            data: {
              role_id: role.id,
              locale_id: localeRecord.id,
              name: localeData.name,
              description: localeData.description,
            },
          });
        })
      );
    }

    const result = await this.get(role.id);

    await this.integrationApi.publishEvent({
      eventName: 'core.role.created',
      sourceModule: 'core',
      aggregateType: 'role',
      aggregateId: String(role.id),
      payload: { id: role.id, slug },
    }).catch(() => null);

    return result;
  }

  async update(id: number, body: UpdateDTO, localeRequest:string) {

    const roleExists = await this.prismaService.role.findUnique({
      where: { id },
    });

    if (!roleExists) {
      throw new NotFoundException(getLocaleText('itemNotFound', localeRequest, `Role with ID ${id} not found`).replace('{{item}}', 'Role'));
    }

    const { locale } = body;

    if (locale) {
      await Promise.all(
        Object.entries(locale).map(async ([localeCode, localeData]) => {
          const localeRecord = await this.localeService.getByCode(localeCode);

          const existing = await this.prismaService.role_locale.findFirst({
            where: {
              role_id: id,
              locale_id: localeRecord.id,
            },
          });

          if (existing) {
            await this.prismaService.role_locale.update({
              where: { id: existing.id },
              data: {
                name: localeData.name,
                description: localeData.description,
              },
            });
          } else {
            await this.prismaService.role_locale.create({
              data: {
                role_id: id,
                locale_id: localeRecord.id,
                name: localeData.name,
                description: localeData.description,
              },
            });
          }
        })
      );
    }

    const result = await this.get(id);

    await this.integrationApi.publishEvent({
      eventName: 'core.role.updated',
      sourceModule: 'core',
      aggregateType: 'role',
      aggregateId: String(id),
      payload: { id, slug: body.slug },
    }).catch(() => null);

    return result;
  }

  async delete({ ids }: DeleteDTO, localeRequest: string = 'en'):Promise<{count:number}> {
    if (ids == undefined || ids == null) {
      throw new BadRequestException(
        getLocaleText('deleteItemsRequired', localeRequest, 'You must select at least one permission to delete.'),
      );
    }

    const existingRoles = await this.prismaService.role.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (existingRoles.length !== ids.length) {
      const existingIds = existingRoles.map((role) => role.id);
      const missingIds = ids.filter((id) => !existingIds.includes(id));
      throw new NotFoundException(getLocaleText('itemsNotFound', localeRequest, `Roles with IDs ${missingIds.join(', ')} not found`).replace('{{items}}', 'Roles'));
    }

    const result = await this.prismaService.role.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    await this.integrationApi.publishEvent({
      eventName: 'core.role.deleted',
      sourceModule: 'core',
      aggregateType: 'role',
      aggregateId: ids.join(','),
      payload: { ids },
    }).catch(() => null);

    return result;
  }
}
