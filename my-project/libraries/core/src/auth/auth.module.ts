import { MailModule as MailSendModule } from '@hed-hog/api-mail';
import { PrismaModule, PrismaService } from '@hed-hog/api-prisma';
import { HttpModule } from '@nestjs/axios';
import { forwardRef, Global, MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import { ChallengeModule } from '../challenge/challenge.module';
import { ChallengeService } from '../challenge/challenge.service';
import { MailSentModule } from '../mail-sent/mail-sent.module';
import { MailModule } from '../mail/mail.module';
import { SecurityModule } from '../security/security.module';
import { SessionModule } from '../session/session.module';
import { SettingModule } from '../setting/setting.module';
import { TokenModule } from '../token/token.module';
import { TokenService } from '../token/token.service';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';

@Global()
@Module({
  imports: [
    forwardRef(() =>
      JwtModule.registerAsync({
        global: true,
        imports: [PrismaModule],
        inject: [PrismaService],
        useFactory: async (prisma: PrismaService) => {
          try {
            const authSettings = await prisma.setting.findMany({
              where: {
                slug: {
                  in: [
                    'access-token-expiration-minutes'
                  ]
                }
              },
              select: {
                slug: true,
                value: true,
              }
            });

            const settings = new Map<string, string>();

            for (const setting of authSettings) {
              settings.set(setting.slug, setting.value);
            }

            const expirationMinutes = settings.get('access-token-expiration-minutes');
            const expiresIn = expirationMinutes ? parseInt(expirationMinutes, 10) * 60 : 15 * 60;

            return {
              secret: String(process.env.JWT_SECRET),
              global: true,
              signOptions: {
                expiresIn, // in seconds
              },
            };
          } catch (error) {
            console.error('Error loading JWT settings from database:', error);
            throw error;
          }
        },
      }),
    ),
    forwardRef(() => PrismaModule),
    forwardRef(() => MailModule),
    forwardRef(() => SettingModule),
    forwardRef(() => MailSentModule),
    forwardRef(() => MailSendModule),
    forwardRef(() => UserModule),
    forwardRef(() => SecurityModule),
    forwardRef(() => TokenModule),
    forwardRef(() => ChallengeModule),
    forwardRef(() => SessionModule),
    ConfigModule,
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [
    Reflector,
    AuthService,
    TokenService,
    ChallengeService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(cookieParser())
      .forRoutes('auth');
  }
}
