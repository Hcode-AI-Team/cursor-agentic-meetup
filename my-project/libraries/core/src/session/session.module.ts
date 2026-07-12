import { PaginationModule } from "@hed-hog/api-pagination";
import { PrismaModule } from "@hed-hog/api-prisma";
import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { SettingModule } from "../setting/setting.module";
import { TokenModule } from "../token/token.module";
import { UserModule } from "../user/user.module";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";

@Module({
  providers: [SessionService],
  exports: [SessionService],
  controllers: [SessionController],
  imports: [
    HttpModule,
    forwardRef(() => PaginationModule),
    forwardRef(() => UserModule),
    forwardRef(() => PrismaModule),
    forwardRef(() => SettingModule),
    forwardRef(() => TokenModule),
    forwardRef(() => SecurityModule),
  ]
})
export class SessionModule {}