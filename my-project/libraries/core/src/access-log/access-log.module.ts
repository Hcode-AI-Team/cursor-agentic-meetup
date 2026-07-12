import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { AccessLogController } from './access-log.controller';
import { AccessLogService } from './access-log.service';

@Module({
  imports: [
    forwardRef(() => PrismaModule),
    forwardRef(() => PaginationModule),
  ],
  controllers: [AccessLogController],
  providers: [AccessLogService],
  exports: [AccessLogService],
})
export class AccessLogModule {}
