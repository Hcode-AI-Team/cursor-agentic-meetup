import { PrismaModule } from "@hed-hog/api-prisma";
import { forwardRef, Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { SecurityModule } from "../security/security.module";
import { SettingModule } from "../setting/setting.module";
import { TokenModule } from "../token/token.module";
import { ChallengeService } from "./challenge.service";

@Module({
  providers: [ChallengeService],
  exports: [ChallengeService],
  imports: [
     forwardRef(() => PrismaModule),
     forwardRef(() => SettingModule),
     forwardRef(() => TokenModule),
     forwardRef(() => SecurityModule),
     forwardRef(() => MailModule),
  ]
})
export class ChallengeModule { }