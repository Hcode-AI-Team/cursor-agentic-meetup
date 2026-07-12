import { MailModule as MailSendModule } from '@hed-hog/api-mail';
import { PrismaModule } from '@hed-hog/api-prisma';
import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { FileModule } from '../file/file.module';
import { MailModule } from '../mail/mail.module';
import { SecurityModule } from '../security/security.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { OAuthCallbackCoordinatorService } from './oauth-callback-coordinator.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { AppleProvider } from './providers/apple.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { GithubProvider } from './providers/github.provider';
import { GoogleProvider } from './providers/google.provider';
import { LinkedinProvider } from './providers/linkedin.provider';
import { MicrosoftEntraIdProvider } from './providers/microsoft-entra-id.provider';
import { MicrosoftProvider } from './providers/microsoft.provider';

@Module({
  imports: [
    forwardRef(() => HttpModule),
    forwardRef(() => PrismaModule),
    forwardRef(() => MailSendModule),
    forwardRef(() => ConfigModule),
    forwardRef(() => FileModule),
    forwardRef(() => MailModule),
    forwardRef(() => SecurityModule),
    forwardRef(() => TokenModule),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
  ],
  controllers: [OAuthController],
  providers: [
    OAuthCallbackCoordinatorService,
    OAuthService,
    GoogleProvider,
    FacebookProvider,
    GithubProvider,
    MicrosoftProvider,
    MicrosoftEntraIdProvider,
    AppleProvider,
    LinkedinProvider,
  ],
  exports: [OAuthService],
})
export class OAuthModule {}
