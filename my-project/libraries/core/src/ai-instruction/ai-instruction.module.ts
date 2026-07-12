import { PrismaModule } from '@hed-hog/api-prisma';
import { Module, forwardRef } from '@nestjs/common';
import { AiExecutionService } from './ai-execution.service';
import { AiInstructionController } from './ai-instruction.controller';
import { AiInstructionService } from './ai-instruction.service';
import { AiPromptBuilderService } from './ai-prompt-builder.service';

@Module({
  imports: [forwardRef(() => PrismaModule)],
  controllers: [AiInstructionController],
  providers: [AiInstructionService, AiExecutionService, AiPromptBuilderService],
  exports: [AiInstructionService, AiExecutionService, AiPromptBuilderService],
})
export class AiInstructionModule {}
