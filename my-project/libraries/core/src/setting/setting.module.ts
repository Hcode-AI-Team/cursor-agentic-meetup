import { LocaleModule } from '@hed-hog/api-locale';
import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { SettingsController } from './setting.controller';
import { SettingService } from './setting.service';

@Global()
@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => PrismaModule),
    forwardRef(() => PaginationModule),
    forwardRef(() => LocaleModule),
    forwardRef(() => MailModule),
  ],
  controllers: [SettingsController],
  providers: [SettingService],
  exports: [SettingService],
})
export class SettingModule { }
