import { LocaleModule } from '@hed-hog/api-locale';
import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { DashboardComponentRoleModule } from './dashboard-component-role/dashboard-component-role.module';
import { DashboardComponentModule } from './dashboard-component/dashboard-component.module';
import { DashboardCoreModule } from './dashboard-core/dashboard-core.module';
import { DashboardItemModule } from './dashboard-item/dashboard-item.module';
import { DashboardRoleModule } from './dashboard-role/dashboard-role.module';
import { DashboardUserModule } from './dashboard-user/dashboard-user.module';
import { DashboardCrudModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    forwardRef(() => LocaleModule),
    forwardRef(() => PrismaModule),
    forwardRef(() => DashboardCrudModule),
    forwardRef(() => DashboardComponentModule),
    forwardRef(() => DashboardComponentRoleModule),
    forwardRef(() => DashboardRoleModule),
    forwardRef(() => DashboardItemModule),
    forwardRef(() => DashboardUserModule),
    forwardRef(() => DashboardCoreModule),
  ],
  controllers: [],
  providers: [],
  exports: [
    forwardRef(() => DashboardCrudModule),
    forwardRef(() => DashboardItemModule),
  ],
})
export class DashboardModule {}
