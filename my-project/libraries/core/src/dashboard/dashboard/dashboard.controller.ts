import { Role } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { Pagination } from '@hed-hog/api-pagination';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import {
  CreateDashboardDTO,
  UpdateDashboardDTO,
} from './dto';
@Role()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getAllDashboards(@Pagination() paginationParams) {
    return this.dashboardService.getAllDashboards(paginationParams);
  }
 
  @Get(':id')
  getDashboard(@Param('id', ParseIntPipe) id: number, @Locale() locale: string) {
    return this.dashboardService.getDashboard(id, locale);
  }
 
  @Post()
  createDashboard(@Body() data: CreateDashboardDTO, @Locale() locale: string) {
    return this.dashboardService.createDashboard(data, locale);
  }
 
  @Patch(':id')
  updateDashboard(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDashboardDTO,
    @Locale() locale: string,
  ) {
    return this.dashboardService.updateDashboard(id, data, locale);
  }
 
  @Delete(':id')
  deleteDashboard(@Param('id', ParseIntPipe) id: number, @Locale() locale: string) {
    return this.dashboardService.deleteDashboard(id, locale);
  }
}
