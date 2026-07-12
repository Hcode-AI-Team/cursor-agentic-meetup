import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { DashboardRoleController } from './dashboard-role.controller';
import { DashboardRoleService } from './dashboard-role.service';

@Module({
  imports: [forwardRef(() => PrismaModule), forwardRef(() => PaginationModule)],
  controllers: [DashboardRoleController],
  providers: [DashboardRoleService],
  exports: [DashboardRoleService],
})
export class DashboardRoleModule {}
