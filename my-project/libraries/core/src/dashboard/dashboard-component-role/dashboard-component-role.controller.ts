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
import { DashboardComponentRoleService } from './dashboard-component-role.service';
import {
    CreateDashboardComponentRoleBatchDTO,
    CreateDashboardComponentRoleDTO,
} from './dto';

@Role()
@Controller('dashboard-component-role')
export class DashboardComponentRoleController {
  constructor(
    @Inject(forwardRef(() => DashboardComponentRoleService))
    private readonly service: DashboardComponentRoleService,
  ) {}

  @Get()
  getAll(
    @Pagination() paginationParams,
    @Locale() locale: string,
    @Query('componentId') componentId?: string,
  ) {
    if (componentId) {
      return this.service.getAllByComponent(parseInt(componentId), locale);
    }
    return this.service.getAll(paginationParams, locale);
  }

  @Post()
  create(@Body() data: CreateDashboardComponentRoleDTO, @Locale() locale: string) {
    return this.service.create(data, locale);
  }

  @Post('batch')
  createBatch(
    @Body() data: CreateDashboardComponentRoleBatchDTO,
    @Locale() locale: string,
  ) {
    return this.service.createBatch(data, locale);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Locale() locale: string) {
    return this.service.delete(id, locale);
  }

  @Delete('component/:componentId/role/:roleId')
  deleteByComponentAndRole(
    @Param('componentId', ParseIntPipe) componentId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Locale() locale: string,
  ) {
    return this.service.deleteByComponentAndRole(componentId, roleId, locale);
  }
}
