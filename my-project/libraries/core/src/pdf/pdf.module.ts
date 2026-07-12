import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SettingModule } from '../setting/setting.module';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => SettingModule),
  ],
  providers: [PdfService],
  exports: [PdfService],
  controllers: [PdfController],
})
export class PdfModule {}
