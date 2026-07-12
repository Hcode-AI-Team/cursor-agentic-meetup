import { forwardRef, Module } from '@nestjs/common';
import { ChallengeModule } from '../challenge/challenge.module';
import { SecurityModule } from '../security/security.module';
import { SettingModule } from '../setting/setting.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => SecurityModule),
    forwardRef(() => ChallengeModule),
    forwardRef(() => SettingModule),
    forwardRef(() => TokenModule),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
