import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SecurityService } from "./security.service";

@Module({
  providers: [SecurityService],
  exports: [SecurityService],
  imports: [ConfigModule]
})
export class SecurityModule {}