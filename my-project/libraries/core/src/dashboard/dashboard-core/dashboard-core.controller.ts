import { Role, User } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DashboardCoreService } from './dashboard-core.service';

@Role()
@Controller('dashboard-core')
export class DashboardCoreController {
  constructor(private readonly dashboardCoreService: DashboardCoreService) {}

  @Get('home')
  getHome(@User() {id}, @Locale() locale: string) {
    return this.dashboardCoreService.getHome(id, locale);
  }

  @Get('stats/overview/users')
  getUserStatistics() {
    return this.dashboardCoreService.getUserStatistics();
  }

  @Get('stats/overview/mails')
  getMailStatistics() {
    return this.dashboardCoreService.getMailStatistics();
  }

  @Get('stats/overview/system')
  getSystemStatistics() {
    return this.dashboardCoreService.getSystemStatistics();
  }

  @Get('config/overview')
  getConfigOverview() {
    return this.dashboardCoreService.getConfigOverview();
  }

  @Get('widgets/me')
  getWidgetsData(@User() user, @Locale() locale: string) {
    return this.dashboardCoreService.getWidgetsData(user.id, locale);
  }

  @Get('user-dashboards')
  getUserDashboards(@User() user, @Locale() locale: string) {
    return this.dashboardCoreService.getUserDashboards(user.id, locale);
  }

  @Get('templates')
  getAvailableTemplates(@User() user, @Locale() locale: string) {
    return this.dashboardCoreService.getAvailableTemplates(user.id, locale);
  }

  @Post('dashboard')
  createUserDashboard(
    @User() user,
    @Body() body: { name?: string; slug?: string; icon?: string | null; templateSlug?: string },
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.createUserDashboard(user.id, body, locale);
  }

  @Patch('dashboard/order')
  reorderUserDashboards(
    @User() user,
    @Body() body: { slugs?: string[] },
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.reorderUserDashboards(
      user.id,
      body.slugs,
      locale,
    );
  }

  @Patch('dashboard/:slug')
  renameUserDashboard(
    @User() user,
    @Param('slug') slug: string,
    @Body() body: { name?: string; icon?: string | null },
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.renameUserDashboard(
      user.id,
      slug,
      body,
      locale,
    );
  }

  @Post('dashboard/:slug/home')
  setHomeDashboard(
    @User() user,
    @Param('slug') slug: string,
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.setHomeDashboard(user.id, slug, locale);
  }

  @Get('dashboard/:slug/shares')
  getDashboardShares(
    @User() user,
    @Param('slug') slug: string,
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.getDashboardShares(user.id, slug, locale);
  }

  @Get('shareable-users/:slug')
  getShareableUsers(
    @User() user,
    @Param('slug') slug: string,
    @Query('search') search: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.getShareableUsers(
      user.id,
      slug,
      {
        search,
        page,
        pageSize,
      },
      locale,
    );
  }

  @Post('dashboard/:slug/share')
  shareDashboard(
    @User() user,
    @Param('slug') slug: string,
    @Body() body: { userId?: number; userIds?: number[] },
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.shareDashboard(
      user.id,
      slug,
      body.userIds,
      body.userId,
      locale,
    );
  }

  @Delete('dashboard/:slug/share/:sharedUserId')
  revokeDashboardShare(
    @User() user,
    @Param('slug') slug: string,
    @Param('sharedUserId', ParseIntPipe) sharedUserId: number,
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.revokeDashboardShare(
      user.id,
      slug,
      sharedUserId,
      locale,
    );
  }

  @Delete('dashboard/:slug')
  removeUserDashboard(
    @User() user,
    @Param('slug') slug: string,
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.removeUserDashboard(user.id, slug, locale);
  }

  @Get('access/:slug')
  checkAccess(@User() user, @Param('slug') slug: string, @Locale() locale: string) {
    return this.dashboardCoreService.checkDashboardAccess(user.id, slug, locale);
  }

  @Get('layout/:slug')
  getUserLayout(@User() user, @Param('slug') slug: string, @Locale() locale: string) {
    return this.dashboardCoreService.getUserLayout(user.id, slug, locale);
  }

  @Post('layout/:slug')
  saveUserLayout(
    @User() user,
    @Param('slug') slug: string,
    @Body() body: { layout: Array<{ i: string; x: number; y: number; w: number; h: number }> },
  ) {
    return this.dashboardCoreService.saveUserLayout(user.id, slug, body.layout);
  }

  @Post('widget/:slug')
  addWidget(
    @User() user,
    @Param('slug') slug: string,
    @Body() body: { componentSlug: string },
    @Locale() locale: string,
  ) {
    return this.dashboardCoreService.addWidgetToUserDashboard(
      user.id,
      slug,
      body.componentSlug,
      locale,
    );
  }

  @Delete('widget/:slug/:widgetId')
  removeWidget(
    @User() user,
    @Param('slug') slug: string,
    @Param('widgetId') widgetId: string,
  ) {
    return this.dashboardCoreService.removeWidgetFromUserDashboard(
      user.id,
      slug,
      widgetId,
    );
  }

  @Get(':slug')
  fromSlug(@Param('slug') slug: string, @Locale() locale) {
    return this.dashboardCoreService.fromSlug(slug, locale);
  }
}
