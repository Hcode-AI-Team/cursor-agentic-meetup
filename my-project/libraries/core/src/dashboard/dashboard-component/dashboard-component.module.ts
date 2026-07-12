import { LocaleModule } from '@hed-hog/api-locale';
import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { DashboardComponentController } from './dashboard-component.controller';
import { DashboardComponentService } from './dashboard-component.service';

@Module({
  imports: [forwardRef(() => LocaleModule), forwardRef(() => PaginationModule), forwardRef(() => PrismaModule)],
  controllers: [DashboardComponentController],
  providers: [DashboardComponentService],
  exports: [DashboardComponentService],
})
export class DashboardComponentModule {}
