import { Role } from '@hed-hog/api';
import { Pagination } from '@hed-hog/api-pagination';
import { Controller, Get, Inject, Query, forwardRef } from '@nestjs/common';
import { AccessLogService } from './access-log.service';
import { QueryAccessLogDto } from './dto/query-access-log.dto';

@Role()
@Controller('access-log')
export class AccessLogController {
  constructor(
    @Inject(forwardRef(() => AccessLogService))
    private readonly accessLogService: AccessLogService,
  ) {}

  @Get()
  async list(
    @Pagination() paginationParams,
    @Query() query: QueryAccessLogDto,
  ) {
    return this.accessLogService.list({
      ...paginationParams,
      userId: query.userId ? Number(query.userId) : undefined,
      userSearch: query.userSearch,
      createdAtFrom: query.createdAtFrom,
      createdAtTo: query.createdAtTo,
      type: query.type,
    });
  }
}
