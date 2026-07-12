import { PrismaModule } from '@hed-hog/api-prisma';
import { Module, forwardRef } from '@nestjs/common';
import { AiInstructionModule } from '../ai-instruction/ai-instruction.module';
import { FileModule } from '../file/file.module';
import { SettingModule } from '../setting/setting.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    forwardRef(() => PrismaModule),
    forwardRef(() => SettingModule),
    forwardRef(() => FileModule),
    forwardRef(() => AiInstructionModule),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
