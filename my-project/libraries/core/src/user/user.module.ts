import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChallengeModule } from '../challenge/challenge.module';
import { FileModule } from '../file/file.module';
import { SecurityModule } from '../security/security.module';
import { SettingModule } from '../setting/setting.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  providers: [
    UserService,
  ],
  exports: [UserService],
  controllers: [UserController],
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => PrismaModule),
    forwardRef(() => PaginationModule),
    forwardRef(() => SecurityModule),
    forwardRef(() => FileModule),
    forwardRef(() => ChallengeModule),
    forwardRef(() => SettingModule),
  ],
})
export class UserModule {}
