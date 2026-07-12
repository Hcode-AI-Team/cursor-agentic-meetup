import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocaleController } from './locale.controller';
import { LocaleService } from './locale.service';

@Module({
  providers: [LocaleService],
  exports: [LocaleService],
  controllers: [LocaleController],
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => PrismaModule),
    forwardRef(() => PaginationModule),
  ],
})
export class LocaleModule {}