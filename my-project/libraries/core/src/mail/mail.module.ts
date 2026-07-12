import { LocaleModule } from '@hed-hog/api-locale';
import { MailModule as MailMainModule, MailModuleOptions } from '@hed-hog/api-mail';
import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule, PrismaService } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { MailSentModule } from '../mail-sent/mail-sent.module';
import { SettingModule } from '../setting/setting.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [
    forwardRef(() => MailMainModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: async (prisma: PrismaService) => {
        try {
          const profileSettings = await prisma.setting.findMany({
            where: {
              slug: {
                in: ['mail-integration-profile-id'],
              },
            },
            select: { slug: true, value: true },
          });

          const profileSettingsMap = new Map(
            profileSettings.map((item) => [item.slug, item.value]),
          );

          const profileSlug = String(
            profileSettingsMap.get('mail-integration-profile-id') ?? '',
          ).trim();

          if (!profileSlug) {
            return { global: true, type: 'SMTP', host: 'localhost', port: 1025, secure: false, username: '', password: '' } as MailModuleOptions;
          }

          const profile = await (prisma as any).integration_profile.findUnique({
            where: { slug: profileSlug },
            include: {
              integration_provider: { select: { slug: true } },
              integration_type: { select: { slug: true } },
            },
          });

          if (!profile) {
            return { global: true, type: 'SMTP', host: 'localhost', port: 1025, secure: false, username: '', password: '' } as MailModuleOptions;
          }

          if (profile.integration_type?.slug !== 'email') {
            return { global: true, type: 'SMTP', host: 'localhost', port: 1025, secure: false, username: '', password: '' } as MailModuleOptions;
          }

          const cfg = (profile.config as Record<string, unknown>) ?? {};
          const base: MailModuleOptions = { global: true } as MailModuleOptions;

          switch (profile.integration_provider.slug) {
            case 'gmail':
              return Object.assign(base, {
                type: 'GMAIL',
                clientId: String(cfg.client_id ?? ''),
                clientSecret: String(cfg.client_secret ?? ''),
                refreshToken: String(cfg.refresh_token ?? ''),
                from: String(cfg.from_email ?? ''),
              });
            case 'smtp':
              return Object.assign(base, {
                type: 'SMTP',
                host: String(cfg.host ?? 'localhost'),
                port: Number(cfg.port ?? 1025),
                secure: Boolean(cfg.secure),
                username: String(cfg.username ?? ''),
                password: String(cfg.password ?? ''),
              });
            case 'ses':
              return Object.assign(base, {
                type: 'SES',
                region: String(cfg.region ?? ''),
                accessKeyId: String(cfg.access_key_id ?? ''),
                secretAccessKey: String(cfg.secret_access_key ?? ''),
                from: String(cfg.from_email ?? ''),
              });
            default:
              return { global: true, type: 'SMTP', host: 'localhost', port: 1025, secure: false, username: '', password: '' } as MailModuleOptions;
          }
        } catch (error) {
          console.error('Error loading mail settings:', error);
          return { global: true, type: 'SMTP', host: 'localhost', port: 1025, secure: false, username: '', password: '' } as MailModuleOptions;
        }
      }
    })),
    forwardRef(() => MailSentModule),
    forwardRef(() => PrismaModule),
    forwardRef(() => PaginationModule),
    forwardRef(() => LocaleModule),
    forwardRef(() => SettingModule),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule { }
