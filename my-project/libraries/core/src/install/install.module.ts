import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { SecurityModule } from '../security/security.module';
import { SettingModule } from '../setting/setting.module';
import { InstallController } from './install.controller';
import { InstallService } from './install.service';

@Module({
  imports: [
    forwardRef(() => PrismaModule),
    forwardRef(() => SettingModule),
    forwardRef(() => SecurityModule),
    forwardRef(() => AuthModule),
    forwardRef(() => ConfigModule),
  ],
  controllers: [InstallController],
  providers: [InstallService],
})
export class InstallModule { }
