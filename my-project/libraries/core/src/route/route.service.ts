import { getLocaleText } from '@hed-hog/api-locale';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DeleteDTO } from '../dto/delete.dto';
import { UpdateIdsDTO } from '../dto/update-ids.dto';
import { CreateDTO } from './dto/create.dto';
import { UpdateDTO } from './dto/update.dto';

@Injectable()
export class RouteService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) {}

  async list(paginationParams: PaginationDTO) {
    const fields = ['url', 'method', 'tool_name', 'name'];

    const OR: any[] = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    return this.paginationService.paginate(
      this.prismaService.route,
      paginationParams,
      {
        where: {
          OR,
        },
        include: {
          role_route: { select: { route_id: true, role_id: true } },
          route_screen: { select: { route_id: true, screen_id: true } },
        },
      },
    );
  }

  async get(routeId: number, locale: string): Promise<any> {
    const route = await this.prismaService.route.findUnique({ where: { id: routeId } });

    if (!route) {
      throw new NotFoundException(getLocaleText('itemNotFound', locale, `Route with ID ${routeId} not found`).replace('{{item}}', 'Route'));
    }

    return route;
  }

  async create({ url, method, type = 'HTTP', tool_name, name }: CreateDTO, locale: string): Promise<any> {

    if (type === 'HTTP' && url && method) {
      const existingRoute = await this.prismaService.route.findFirst({
        where: { url, method },
      });
      if (existingRoute) {
        throw new BadRequestException(
          getLocaleText('itemAlreadyExists', locale, `Route with URL ${url} and method ${method} already exists`).replace('{{item}}', 'Route'),
        );
      }
    }

    if (type === 'MCP' && tool_name) {
      const existingTool = await this.prismaService.route.findFirst({
        where: { tool_name },
      });
      if (existingTool) {
        throw new BadRequestException(
          getLocaleText('itemAlreadyExists', locale, `MCP tool '${tool_name}' already exists`).replace('{{item}}', 'MCP tool'),
        );
      }
    }

    return this.prismaService.route.create({ data: { url, method, type: type as any, tool_name, name } });
  }

  async update({ id, data }: { id: number; data: UpdateDTO }, locale: string): Promise<any> {

    const routeExists = await this.prismaService.route.findUnique({
      where: { id },
    });

    if (!routeExists) {
      throw new NotFoundException(getLocaleText('itemNotFound', locale, `Route with ID ${id} not found`).replace('{{item}}', 'Route'));
    }

    return this.prismaService.route.update({
      where: { id },
      data,
    });
  }

  async delete({ ids }: DeleteDTO, locale: string):Promise<{count:number}> {

    const existingRoutes = await this.prismaService.route.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (existingRoutes.length !== ids.length) {
      const existingIds = existingRoutes.map((route) => route.id);
      const missingIds = ids.filter((id) => !existingIds.includes(id));
      throw new NotFoundException(getLocaleText('itemsNotFound', locale, `Routes with IDs ${missingIds.join(', ')} not found`).replace('{{items}}', 'Routes'));
    }

    return this.prismaService.route.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async listRoles(
    locale: string,
    routeId: number,
    paginationParams: PaginationDTO,
  ) {
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
          role_route: {
            where: {
              route_id: routeId,
            },
            select: {
              route_id: true,
              role_id: true,
            },
          },
        },
      },
      'role_locale',
    );
  }

  async updateRoles(routeId: number, data: UpdateIdsDTO):Promise<{count:number}> {
    await this.prismaService.role_route.deleteMany({
      where: {
        route_id: routeId,
      },
    });

    return this.prismaService.role_route.createMany({
      data: data.ids.map((roleId) => ({
        role_id: roleId,
        route_id: routeId,
      })),
      skipDuplicates: true,
    });
  }

  async listScreens(
    locale: string,
    routeId: number,
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
          route_screen: {
            where: {
              route_id: routeId,
            },
            select: {
              route_id: true,
              screen_id: true,
            },
          },
        },
      },
      'screen_locale',
    );
  }

  async updateScreens(routeId: number, data: UpdateIdsDTO):Promise<{count:number}> {
    await this.prismaService.route_screen.deleteMany({
      where: {
        route_id: routeId,
      },
    });

    return this.prismaService.route_screen.createMany({
      data: data.ids.map((screenId) => ({
        screen_id: screenId,
        route_id: routeId,
      })),
      skipDuplicates: true,
    });
  }
}
