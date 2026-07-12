import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { Module, forwardRef } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { AiModule } from '../ai/ai.module';
import { SystemModule } from '../core/system.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { FileModule } from '../file/file.module';
import { IntegrationProfileModule } from '../integration-profile/integration-profile.module';
import { MailModule } from '../mail/mail.module';
import { MailSentModule } from '../mail-sent/mail-sent.module';
import { McpChatService } from '../mcp-chat/mcp-chat.service';
import { MenuModule } from '../menu/menu.module';
import { NotificationModule } from '../notification/notification.module';
import { ProfileModule } from '../profile/profile.module';
import { RoleModule } from '../role/role.module';
import { RouteModule } from '../route/route.module';
import { ScreenModule } from '../screen/screen.module';
import { SecurityModule } from '../security/security.module';
import { SessionModule } from '../session/session.module';
import { SettingModule } from '../setting/setting.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { WebhookIntegrationModule } from '../webhook-integration/webhook-integration.module';
import { McpAuthGuard } from './guards/mcp-auth.guard';
import { McpPermissionGuard } from './guards/mcp-permission.guard';
import { McpApiKeyController } from './mcp-api-key.controller';
import { McpApiKeyService } from './mcp-api-key.service';
import { McpAuditService } from './mcp-audit.service';
import { McpRegistryService } from './mcp-registry.service';
import { McpServerService } from './mcp-server.service';
import { McpController } from './mcp.controller';
import { CoreAiMcpTools } from './tools/core-ai.mcp-tools';
import { CoreDashboardItemsMcpTools } from './tools/core-dashboard-items.mcp-tools';
import { CoreDashboardMcpTools } from './tools/core-dashboard.mcp-tools';
import { CoreEventWebhooksMcpTools } from './tools/core-event-webhooks.mcp-tools';
import { CoreFilesMcpTools } from './tools/core-files.mcp-tools';
import { CoreIntegrationEventsMcpTools } from './tools/core-integration-events.mcp-tools';
import { CoreMailMcpTools } from './tools/core-mail.mcp-tools';
import { CoreMailSentMcpTools } from './tools/core-mail-sent.mcp-tools';
import { CoreMcpChatMcpTools } from './tools/core-mcp-chat.mcp-tools';
import { CoreMenusMcpTools } from './tools/core-menus.mcp-tools';
import { CoreNotificationsMcpTools } from './tools/core-notifications.mcp-tools';
import { CoreProfileMcpTools } from './tools/core-profile.mcp-tools';
import { CoreRolesMcpTools } from './tools/core-roles.mcp-tools';
import { CoreRoutesMcpTools } from './tools/core-routes.mcp-tools';
import { CoreScreensMcpTools } from './tools/core-screens.mcp-tools';
import { CoreSessionsMcpTools } from './tools/core-sessions.mcp-tools';
import { CoreSettingsMcpTools } from './tools/core-settings.mcp-tools';
import { CoreSystemMcpTools } from './tools/core-system.mcp-tools';
import { CoreUsersMcpTools } from './tools/core-users.mcp-tools';
import { CoreWebhooksMcpTools } from './tools/core-webhooks.mcp-tools';
import { AccessLogModule } from '../access-log/access-log.module';

@Module({
  imports: [
    DiscoveryModule,
    forwardRef(() => PrismaModule),
    forwardRef(() => AccessLogModule),
    forwardRef(() => PaginationModule),
    forwardRef(() => TokenModule),
    forwardRef(() => SettingModule),
    forwardRef(() => UserModule),
    forwardRef(() => SecurityModule),
    forwardRef(() => RoleModule),
    forwardRef(() => RouteModule),
    forwardRef(() => MenuModule),
    forwardRef(() => ScreenModule),
    forwardRef(() => FileModule),
    forwardRef(() => MailModule),
    forwardRef(() => IntegrationProfileModule),
    forwardRef(() => MailSentModule),
    forwardRef(() => SessionModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => DashboardModule),
    forwardRef(() => WebhookIntegrationModule),
    forwardRef(() => AiModule),
    forwardRef(() => ProfileModule),
    forwardRef(() => SystemModule),
  ],
  controllers: [McpController, McpApiKeyController],
  providers: [
    McpRegistryService,
    McpServerService,
    McpAuditService,
    McpAuthGuard,
    McpPermissionGuard,
    McpApiKeyService,
    McpChatService,
    CoreSettingsMcpTools,
    CoreUsersMcpTools,
    CoreRolesMcpTools,
    CoreRoutesMcpTools,
    CoreMenusMcpTools,
    CoreScreensMcpTools,
    CoreProfileMcpTools,
    CoreSessionsMcpTools,
    CoreFilesMcpTools,
    CoreMailMcpTools,
    CoreMailSentMcpTools,
    CoreNotificationsMcpTools,
    CoreDashboardMcpTools,
    CoreDashboardItemsMcpTools,
    CoreWebhooksMcpTools,
    CoreEventWebhooksMcpTools,
    CoreIntegrationEventsMcpTools,
    CoreAiMcpTools,
    CoreMcpChatMcpTools,
    CoreSystemMcpTools,
  ],
  exports: [McpRegistryService, McpServerService, McpApiKeyService],
})
export class McpModule {}
