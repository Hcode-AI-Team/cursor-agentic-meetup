import { LogInterceptor } from '@hed-hog/api';
import { LocaleModule } from '@hed-hog/api-locale';
import { MailModule as MailSendModule } from '@hed-hog/api-mail';
import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule, PrismaService } from '@hed-hog/api-prisma';
import { HttpModule } from '@nestjs/axios';
import { forwardRef, Global, Inject, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AccessLogInterceptor } from './access-log/access-log.interceptor';
import { AccessLogModule } from './access-log/access-log.module';
import { AccessLogService } from './access-log/access-log.service';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { SystemModule } from './core/system.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FileModule } from './file/file.module';
import { InstallModule } from './install/install.module';
import { IntegrationModule } from './integration/integration.module';
import { LocaleModule as CoreLocaleModule } from './locale/locale.module';
import { MailSentModule } from './mail-sent/mail-sent.module';
import { MailModule } from './mail/mail.module';
import { McpChatModule } from './mcp-chat/mcp-chat.module';
import { McpModule } from './mcp/mcp.module';
import { MenuModule } from './menu/menu.module';
import { LocaleInjectionMiddleware } from './middlewares/locale-injection.middleware';
import { NotificationModule } from './notification/notification.module';
import { OAuthModule } from './oauth/oauth.module';
import { PdfModule } from './pdf/pdf.module';
import { ProfileModule } from './profile/profile.module';
import { RoleModule } from './role/role.module';
import { RouteModule } from './route/route.module';
import { ScreenModule } from './screen/screen.module';
import { SecurityModule } from './security/security.module';
import { SessionModule } from './session/session.module';
import { SettingModule } from './setting/setting.module';
import { SettingService } from './setting/setting.service';
import { TaskModule } from './task/task.module';
import { UserModule } from './user/user.module';
import { IsEmailWithSettingsConstraint } from './validators/is-email-with-settings.validator';
import { IsPinCodeWithSettingConstraint } from './validators/is-pin-code-with-setting.validator';
import { IsStrongPasswordWithSettingsConstraint } from './validators/is-strong-password-with-settings.validator';
import { ValidatorServiceLocator } from './validators/service-locator';
import { AiInstructionModule } from './ai-instruction/ai-instruction.module';
import { IntegrationProfileModule } from './integration-profile/integration-profile.module';
import { WebhookIntegrationModule } from './webhook-integration/webhook-integration.module';

@Global()
@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot(),
    forwardRef(() => AiModule),
    forwardRef(() => InstallModule),
    forwardRef(() => AuthModule),
    forwardRef(() => DashboardModule),
    forwardRef(() => MailSendModule),
    forwardRef(() => MenuModule),
    forwardRef(() => PaginationModule),
    forwardRef(() => RoleModule),
    forwardRef(() => RouteModule),
    forwardRef(() => PrismaModule),
    forwardRef(() => ScreenModule),
    forwardRef(() => LocaleModule),
    forwardRef(() => CoreLocaleModule),
    forwardRef(() => UserModule),
    forwardRef(() => SystemModule),
    forwardRef(() => SettingModule),
    forwardRef(() => MailModule),
    forwardRef(() => IntegrationProfileModule),
    forwardRef(() => MailSentModule),
    forwardRef(() => FileModule),
    forwardRef(() => TaskModule),
    forwardRef(() => SecurityModule),
    forwardRef(() => ProfileModule),
    forwardRef(() => SessionModule),
    forwardRef(() => OAuthModule),
    forwardRef(() => IntegrationModule),
    forwardRef(() => WebhookIntegrationModule),
    forwardRef(() => AiInstructionModule),
    forwardRef(() => McpModule),
    forwardRef(() => McpChatModule),
    forwardRef(() => PdfModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => AccessLogModule),
  ],
  exports: [
    UserModule,
    AuthModule,
    MailModule,
    IntegrationProfileModule,
    RouteModule,
    RoleModule,
    MenuModule,
    ScreenModule,
    LocaleModule,
    CoreLocaleModule,
    SettingModule,
    FileModule,
    SessionModule,
    AiModule,
    AiInstructionModule,
    IntegrationModule,
    WebhookIntegrationModule,
    IsStrongPasswordWithSettingsConstraint,
    IsEmailWithSettingsConstraint,
    IsPinCodeWithSettingConstraint,
    PdfModule,
    NotificationModule,
    AccessLogModule,
  ],
  providers: [
    Reflector,
    IsStrongPasswordWithSettingsConstraint,
    IsEmailWithSettingsConstraint,
    IsPinCodeWithSettingConstraint,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector, prismaService: PrismaService) => {
        return new LogInterceptor(reflector, prismaService);
      },
      inject: [Reflector, PrismaService],
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (accessLogService: AccessLogService) => {
        return new AccessLogInterceptor(accessLogService);
      },
      inject: [AccessLogService],
    },
  ]
})
export class CoreModule implements NestModule, OnModuleInit {
  constructor(
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService
  ) {}

  onModuleInit() {
    // Initialize the service locator for validators
    ValidatorServiceLocator.setSettingService(this.settingService);
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LocaleInjectionMiddleware)
      .forRoutes('*');
  }
}
