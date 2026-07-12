import { Role } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { Pagination } from '@hed-hog/api-pagination';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  forwardRef
} from '@nestjs/common';
import { DashboardItemService } from './dashboard-item.service';
import { CreateDashboardItemDTO } from './dto';

@Role()
@Controller('dashboard-item')
export class DashboardItemController {
  constructor(
    @Inject(forwardRef(() => DashboardItemService))
    private readonly dashboardItemService: DashboardItemService,
  ) {}

  @Get()
  getAllDashboardItems(
    @Pagination() paginationParams,
    @Locale() locale: string,
    @Query('dashboardId') dashboardId?: string,
  ) {
    const id = dashboardId ? parseInt(dashboardId) : undefined;
    return this.dashboardItemService.getAllDashboardItems(paginationParams, locale, id);
  }

  @Post()
  createDashboardItem(@Body() data: CreateDashboardItemDTO, @Locale() locale: string) {
    return this.dashboardItemService.createDashboardItem(data, locale);
  }

  @Delete(':id')
  deleteDashboardItem(@Param('id', ParseIntPipe) id: number, @Locale() locale: string) {
    return this.dashboardItemService.deleteDashboardItem(id, locale);
  }
}
