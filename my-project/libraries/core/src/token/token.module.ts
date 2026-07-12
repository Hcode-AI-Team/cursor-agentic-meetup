import { PrismaModule } from "@hed-hog/api-prisma";
import { forwardRef, Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { SettingModule } from "../setting/setting.module";
import { TokenService } from "./token.service";

@Module({
  providers: [TokenService],
  exports: [TokenService],
  imports: [
      forwardRef(() => PrismaModule),
      forwardRef(() => SettingModule),
      forwardRef(() => SecurityModule),
    ]
})
export class TokenModule {}