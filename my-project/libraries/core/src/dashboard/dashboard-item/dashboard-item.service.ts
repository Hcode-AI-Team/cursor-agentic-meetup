import { getLocaleText, LocaleService } from '@hed-hog/api-locale';
import { PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { CreateDashboardItemDTO } from './dto';

@Injectable()
export class DashboardItemService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
    @Inject(forwardRef(() => LocaleService))
    private readonly localeService: LocaleService,
  ) {}

  async getAllDashboardItems(paginationParams, locale: string, dashboardId?: number) {
    return this.paginationService.paginate(
      this.prismaService.dashboard_item,
      paginationParams,
      {
        where: dashboardId ? { dashboard_id: dashboardId } : undefined,
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
        orderBy: {
          id: 'desc',
        },
      },
      'dashboardItem',
    );
  }

  async createDashboardItem(data: CreateDashboardItemDTO, locale: string) {
    return this.prismaService.dashboard_item.create({
      data: {
        dashboard_id: data.dashboard_id,
        component_id: data.component_id,
        width: data.width,
        height: data.height,
        x_axis: data.x_axis,
        y_axis: data.y_axis,
      },
      include: {
        dashboard: true,
        dashboard_component: true,
      },
    });
  }

  async deleteDashboardItem(id: number, locale: string) {
    const item = await this.prismaService.dashboard_item.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(
        getLocaleText('dashboardItemNotFound', locale, 'Dashboard item not found'),
      );
    }

    await this.prismaService.dashboard_item.delete({
      where: { id },
    });
    return { success: true };
  }
}
