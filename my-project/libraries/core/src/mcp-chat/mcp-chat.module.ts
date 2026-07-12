import { PrismaModule } from '@hed-hog/api-prisma';
import { Module, forwardRef } from '@nestjs/common';
import { AiInstructionModule } from '../ai-instruction/ai-instruction.module';
import { McpModule } from '../mcp/mcp.module';
import { SettingModule } from '../setting/setting.module';
import { McpChatController } from './mcp-chat.controller';
import { McpChatService } from './mcp-chat.service';

@Module({
  imports: [
    forwardRef(() => PrismaModule),
    forwardRef(() => SettingModule),
    forwardRef(() => McpModule),
    forwardRef(() => AiInstructionModule),
  ],
  controllers: [McpChatController],
  providers: [McpChatService],
})
export class McpChatModule {}
