import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { DashboardComponentRoleController } from './dashboard-component-role.controller';
import { DashboardComponentRoleService } from './dashboard-component-role.service';

@Module({
  imports: [forwardRef(() => PrismaModule), forwardRef(() => PaginationModule)],
  controllers: [DashboardComponentRoleController],
  providers: [DashboardComponentRoleService],
  exports: [DashboardComponentRoleService],
})
export class DashboardComponentRoleModule {}
