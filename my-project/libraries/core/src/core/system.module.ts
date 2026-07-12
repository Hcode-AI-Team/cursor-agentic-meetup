import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [
    forwardRef(() =>
      JwtModule,
    ),
    forwardRef(() => PrismaModule),
  ],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule { }
