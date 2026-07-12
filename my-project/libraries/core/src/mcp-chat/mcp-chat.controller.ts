import { Role, User } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { DeleteDTO } from '../dto/delete.dto';
import { CreateConversationDTO } from './dto/create-conversation.dto';
import { SendMessageDTO } from './dto/send-message.dto';
import { McpChatService } from './mcp-chat.service';

@Role()
@Controller('mcp-chat')
export class McpChatController {
  constructor(private readonly service: McpChatService) {}

  @Get()
  listConversations(@User() { id }: { id: number }) {
    return this.service.listConversations(id);
  }

  @Post()
  createConversation(
    @User() { id }: { id: number },
    @Body() dto: CreateConversationDTO,
  ) {
    return this.service.createConversation(id, dto);
  }

  @Delete()
  deleteConversations(
    @User() { id }: { id: number },
    @Body() dto: DeleteDTO,
  ) {
    return this.service.deleteConversations(id, dto.ids);
  }

  @Get(':id/messages')
  getMessages(
    @User() { id }: { id: number },
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    return this.service.getMessages(conversationId, id);
  }

  @Post(':id/messages')
  sendMessage(
    @User() { id }: { id: number },
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDTO,
    @Locale() locale: string,
  ) {
    return this.service.sendMessage(conversationId, id, locale, dto.message);
  }

  @Post(':id/messages/stream')
  async sendMessageStream(
    @User() { id }: { id: number },
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDTO,
    @Locale() locale: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const writeEvent = (payload: unknown) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const messages = await this.service.sendMessage(
        conversationId,
        id,
        locale,
        dto.message,
      );

      const lastAssistant = [...messages]
        .reverse()
        .find((msg) => msg.role === 'assistant');
      const content = lastAssistant?.content ?? '';

      if (content.length > 0) {
        const chunkSize = Math.max(8, Math.min(32, Math.ceil(content.length / 80)));
        for (let cursor = 0; cursor < content.length; cursor += chunkSize) {
          writeEvent({
            type: 'chunk',
            content: content.slice(cursor, cursor + chunkSize),
          });
        }
      }

      writeEvent({ type: 'done', messages });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to stream message';
      writeEvent({ type: 'error', message });
    } finally {
      res.end();
    }
  }
}
