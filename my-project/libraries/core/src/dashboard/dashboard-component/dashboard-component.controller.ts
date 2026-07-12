import { Role, User } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { Pagination } from '@hed-hog/api-pagination';
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
    forwardRef
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DashboardComponentService } from './dashboard-component.service';
import {
    CreateDashboardComponentDTO,
    UpdateDashboardComponentDTO,
} from './dto';

@Role()
@Controller('dashboard-component')
export class DashboardComponentController {
  constructor(
    @Inject(forwardRef(() => DashboardComponentService))
    private readonly dashboardComponentService: DashboardComponentService,
  ) {}

  @Get()
  getAllComponents(@Pagination() paginationParams) {
    return this.dashboardComponentService.getAllComponents(paginationParams);
  }

  @Get('user')
  getAllComponentsByUserRole(
    @Pagination() paginationParams,
    @User() { id },
    @Query('librarySlug') librarySlug?: string,
    @Query('exclude') exclude?: string,
  ) {
    return this.dashboardComponentService.getAllComponentsByUserRole(
      {
        ...paginationParams,
        librarySlug,
        exclude,
      },
      id,
    );
  }

  @Get(':id')
  getComponent(
    @Param('id', ParseIntPipe) id: number,
    @Locale() locale: string,
    @User() { id: userId },
  ) {
    return this.dashboardComponentService.getComponent(id, locale, userId);
  }

  @Post()
  createComponent(@Body() data: CreateDashboardComponentDTO, @Locale() locale: string) {
    return this.dashboardComponentService.createComponent(data, locale);
  }

  @Patch(':id')
  updateComponent(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDashboardComponentDTO,
    @Locale() locale: string,
  ) {
    return this.dashboardComponentService.updateComponent(id, data, locale);
  }

  @Delete(':id')
  deleteComponent(@Param('id', ParseIntPipe) id: number, @Locale() locale: string) {
    return this.dashboardComponentService.deleteComponent(id, locale);
  }

  @Post(':id/preview')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (!file?.mimetype?.startsWith('image/')) {
          return cb(new BadRequestException('Invalid image file'), false);
        }

        cb(null, true);
      },
    }),
  )
  savePreview(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: MulterFile,
    @Locale() locale: string,
  ) {
    return this.dashboardComponentService.savePreview(id, file, locale);
  }
}
