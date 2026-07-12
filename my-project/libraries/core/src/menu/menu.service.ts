import { itemTranslations } from '@hed-hog/api';
import { getLocaleText } from '@hed-hog/api-locale';
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
import { CreateDTO } from './dto/create.dto';
import { OrderDTO } from './dto/order.dto';
import { UpdateDTO } from './dto/update.dto';

@Injectable()
export class MenuService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) {}

  private async ensureValidParent(
    locale: string,
    currentMenuId: number | null,
    parentId?: number | null,
  ): Promise<void> {
    if (parentId == null) {
      return;
    }

    const parent = await this.prismaService.menu.findUnique({
      where: { id: parentId },
      select: { id: true, menu_id: true },
    });

    if (!parent) {
      throw new BadRequestException(
        getLocaleText('menuNotFound', locale, 'Menu not found.'),
      );
    }

    if (currentMenuId != null && parentId === currentMenuId) {
      throw new BadRequestException(
        getLocaleText(
          'menuInvalidParent',
          locale,
          'A menu cannot be its own parent.',
        ),
      );
    }

    if (currentMenuId == null) {
      return;
    }

    const visited = new Set<number>([currentMenuId]);
    let cursor: { id: number; menu_id: number | null } | null = parent;

    while (cursor) {
      if (visited.has(cursor.id)) {
        throw new BadRequestException(
          getLocaleText(
            'menuInvalidParent',
            locale,
            'You cannot move a menu inside itself or one of its descendants.',
          ),
        );
      }

      visited.add(cursor.id);

      if (cursor.menu_id == null) {
        break;
      }

      cursor = await this.prismaService.menu.findUnique({
        where: { id: cursor.menu_id },
        select: { id: true, menu_id: true },
      });
    }
  }

  async updateScreens(locale:string,menuId: number, data: UpdateIdsDTO): Promise<{count:number}> {

    const menuExists = await this.prismaService.menu.count({
      where: {
        id: menuId,
      },
    });

    if (!menuExists) {
      throw new BadRequestException(
        getLocaleText('menuNotFound', locale, 'Menu not found.'),
      );
    }

    await this.prismaService.menu_screen.deleteMany({
      where: {
        menu_id: menuId,
      },
    });

    return this.prismaService.menu_screen.createMany({
      data: data.ids.map((screenId) => ({
        menu_id: menuId,
        screen_id: screenId,
      })),
      skipDuplicates: true,
    });
  }
  async updateRoles(locale:string, menuId: number, data: UpdateIdsDTO): Promise<{count:number}> {

    const menuExists = await this.prismaService.menu.count({
      where: {
        id: menuId,
      },
    });

    if (!menuExists) {
      throw new BadRequestException(
        getLocaleText('menuNotFound', locale, 'Menu not found.'),
      );
    }

    await this.prismaService.role_menu.deleteMany({
      where: {
        menu_id: menuId,
      },
    });

    return this.prismaService.role_menu.createMany({
      data: data.ids.map((roleId) => ({
        menu_id: menuId,
        role_id: roleId,
      })),
      skipDuplicates: true,
    });
  }
  async listScreens(
    locale: string,
    menuId: number,
    paginationParams: PaginationDTO,
  ) {

    const menuExists = await this.prismaService.menu.count({
      where: {
        id: menuId,
      },
    });

    if (!menuExists) {
      throw new BadRequestException(
        getLocaleText('menuNotFound', locale, 'Menu not found.'),
      );
    }

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
          menu_screen: {
            where: {
              menu_id: menuId,
            },
            select: {
              screen_id: true,
              menu_id: true,
            },
          },
        },
      },
      'screen_locale',
    );
  }
  async listRoles(
    locale: string,
    menuId: number,
    paginationParams: PaginationDTO,
  ) {

    const menuExists = await this.prismaService.menu.count({
      where: {
        id: menuId,
      },
    });

    if (!menuExists) {
      throw new BadRequestException(
        getLocaleText('menuNotFound', locale, 'Menu not found.'),
      );
    }

    return this.paginationService.paginate(
      this.prismaService.role,
      paginationParams,
      {
        include: {
          role_locale: {
            where: {
              locale: {
                code: locale,
              },
            },
            select: {
              name: true,
              description: true,
            },
          },
          role_menu: {
            where: {
              menu_id: menuId,
            },
            select: {
              role_id: true,
              menu_id: true,
            },
          },
          role_user: {
            select: {
              user_id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  user_identifier: {
                    where: {
                      type: 'email',
                    },
                    select: {
                      value: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
      'role_locale',
    );
  }

  async getMenus(locale: string, userId: number, menuId = 0) {

    const userExists = await this.prismaService.user.count({
      where: {
        id: userId,
      },
    });

    if (!userExists) {
      throw new BadRequestException(
        getLocaleText('userNotFound', locale, 'User not found.'),
      );
    }

    if (menuId === 0) {
      menuId = null;
    }

    let menu = (await this.prismaService.menu.findMany({
      where: {
        menu_id: menuId,
        role_menu: {
          some: {
            role: {
              role_user: {
                some: {
                  user_id: userId,
                },
              },
            },
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
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
      },
    })) as unknown[] as any[];

    menu = menu.map((m) => itemTranslations('menu_locale', m));

    for (let i = 0; i < menu.length; i++) {
      menu[i].menu = await this.getMenus(locale, userId, menu[i].id);
    }

    return menu;
  }

  async getSystemMenu(locale: string, userId: number) {
    return this.getMenus(locale, userId);
  }

  async stats() {
    const total = await this.prismaService.menu.count();
    return { total };
  }

  async listAll(locale: string) {
    const menus = await this.prismaService.menu.findMany({
      orderBy: { order: 'asc' },
      include: {
        menu_locale: {
          where: { locale: { code: locale } },
          select: { name: true },
        },
        _count: {
          select: {
            role_menu: true,
          },
        },
      },
    });
    return menus.map((m: any) => itemTranslations('menu_locale', m));
  }

  async list(locale: string, paginationParams: PaginationDTO) {
    const search = paginationParams.search;
    const whereOr: any[] = [];

    if (search) {
      whereOr.push(
        { url: { contains: search, mode: 'insensitive' } },
        { icon: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        {
          menu_locale: {
            some: {
              name: { contains: search, mode: 'insensitive' },
              locale: { code: locale },
            },
          },
        },
      );
    }

    return this.paginationService.paginate(
      this.prismaService.menu,
      paginationParams,
      {
        where: whereOr.length ? { OR: whereOr } : {},
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
          _count: {
            select: {
              role_menu: true,
            },
          },
        },
      },
      'menu_locale',
    );
  }

  async get(locale: string, menuId: number) {
    const menu = await this.prismaService.menu.findUnique({
      where: { id: menuId },
      include: {
        menu_locale: {
          include: {
            locale: {
              select: { code: true },
            },
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException(
        getLocaleText('menuNotFound', locale, 'Menu not found.'),
      );
    }

    return menu;
  }

  async create(_locale: string, { slug, url, icon, order, menu_id, locale }: CreateDTO) {
    await this.ensureValidParent(_locale, null, menu_id);

    const created = await this.prismaService.menu.create({
      data: { slug, url, icon, order, menu_id },
    });

    if (locale && typeof locale === 'object') {
      for (const [localeCode, name] of Object.entries(locale)) {
        const localeRecord = await this.prismaService.locale.findUnique({
          where: { code: localeCode },
        });
        if (localeRecord && name) {
          await this.prismaService.menu_locale.create({
            data: {
              menu_id: created.id,
              locale_id: localeRecord.id,
              name: name as string,
            },
          });
        }
      }
    }

    return created;
  }

  async update(locale:string, { id, data }: { id: number; data: UpdateDTO }) {

    const menuExists = await this.prismaService.menu.count({
      where: {
        id,
      },
    });

    await this.ensureValidParent(locale, id, data.menu_id);

    if (!menuExists) {
      throw new BadRequestException(
        getLocaleText('menuNotFound', locale, 'Menu not found.'),
      );
    }

    const { locale: localeData, ...menuData } = data;

    const result = await this.prismaService.menu.update({
      where: { id },
      data: menuData
    });

    if (localeData) {
      for (const [localeCode, translation] of Object.entries(localeData)) {
        const localeRecord = await this.prismaService.locale.findUnique({
          where: { code: localeCode },
        });

        if (localeRecord) {
          const existingTranslation = await this.prismaService.menu_locale.findFirst({
            where: {
              menu_id: id,
              locale_id: localeRecord.id,
            },
          });

          if (existingTranslation) {
            await this.prismaService.menu_locale.update({
              where: { id: existingTranslation.id },
              data: { name: translation },
            });
          } else {
            await this.prismaService.menu_locale.create({
              data: {
                menu_id: id,
                locale_id: localeRecord.id,
                name: translation,
              },
            });
          }
        }
      }
    }

    return result;
  }

  async delete(locale: string, { ids }: DeleteDTO): Promise<{count:number}> {
    if (ids == undefined || ids == null) {
      throw new BadRequestException(
        getLocaleText('deleteItemsRequired', locale, 'You must select at least one menu to delete.'),
      );
    }

    const count = await this.prismaService.menu.count({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (count !== ids.length) {
      throw new BadRequestException(
        getLocaleText('invalidIds', locale, 'Invalid IDs.'),
      );
    }

    return this.prismaService.menu.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async updateOrder(locale: string, { ids }: OrderDTO): Promise<void> {
    const count = await this.prismaService.menu.count({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (count !== ids.length) {
      throw new BadRequestException(getLocaleText('invalidIds', locale, 'Invalid IDs.'));
    }

    await Promise.all(
      ids.map((id, index) =>
        this.prismaService.menu.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
  }
}
