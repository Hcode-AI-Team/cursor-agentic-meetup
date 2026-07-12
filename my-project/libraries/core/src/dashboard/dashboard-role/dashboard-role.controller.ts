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
    forwardRef,
} from '@nestjs/common';
import { DashboardRoleService } from './dashboard-role.service';
import {
    CreateDashboardRoleBatchDTO,
    CreateDashboardRoleDTO,
} from './dto';

@Role()
@Controller('dashboard-role')
export class DashboardRoleController {
  constructor(
    @Inject(forwardRef(() => DashboardRoleService))
    private readonly service: DashboardRoleService,
  ) {}

  @Get()
  getAll(
    @Pagination() paginationParams,
    @Query('dashboardId') dashboardId?: string,
  ) {
    if (dashboardId) return this.service.getAllByDashboard(parseInt(dashboardId));
    return this.service.getAll(paginationParams);
  }

  @Post()
  create(@Body() data: CreateDashboardRoleDTO, @Locale() locale: string) {
    return this.service.create(data, locale);
  }

  @Post('batch')
  createBatch(
    @Body() data: CreateDashboardRoleBatchDTO,
    @Locale() locale: string,
  ) {
    return this.service.createBatch(data, locale);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Locale() locale: string) {
    return this.service.delete(id, locale);
  }

  @Delete('dashboard/:dashboardId/role/:roleId')
  deleteByDashboardAndRole(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Locale() locale: string,
  ) {
    return this.service.deleteByDashboardAndRole(dashboardId, roleId, locale);
  }
}
