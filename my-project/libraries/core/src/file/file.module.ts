import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SettingModule } from '../setting/setting.module';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { ImageOptimizationService } from './image-optimization.service';

@Module({
  imports: [
    forwardRef(() => PrismaModule),
    forwardRef(() => PaginationModule),
    forwardRef(() => SettingModule),
    forwardRef(() =>
      JwtModule,
    ),
  ],
  providers: [FileService, ImageOptimizationService],
  exports: [FileService, ImageOptimizationService],
  controllers: [FileController],
})
export class FileModule { }
