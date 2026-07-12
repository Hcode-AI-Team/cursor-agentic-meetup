import { Injectable } from '@nestjs/common';
import { McpChatService } from '../../mcp-chat/mcp-chat.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreMcpChatMcpTools {
  constructor(private readonly mcpChatService: McpChatService) {}

  @McpTool({
    name: 'core.mcp-chat.conversations.list',
    description: 'Lists MCP chat conversations for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async listConversations(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.mcpChatService.listConversations(context.userId);
  }

  @McpTool({
    name: 'core.mcp-chat.conversations.create',
    description: 'Creates a new MCP chat conversation.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Conversation title' },
      },
      required: ['title'],
    },
  })
  async createConversation(args: { title: string }, context: McpContext): Promise<any> {
    return this.mcpChatService.createConversation(context.userId, { title: args.title });
  }

  @McpTool({
    name: 'core.mcp-chat.conversations.delete',
    description: 'Deletes one or more MCP chat conversations.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Conversation IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteConversations(args: { ids: number[] }, context: McpContext): Promise<any> {
    return this.mcpChatService.deleteConversations(context.userId, args.ids);
  }

  @McpTool({
    name: 'core.mcp-chat.messages.list',
    description: 'Returns messages in a conversation.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: { type: 'number', description: 'Conversation ID' },
      },
      required: ['conversationId'],
    },
    readOnly: true,
  })
  async getMessages(args: { conversationId: number }, context: McpContext): Promise<any> {
    return this.mcpChatService.getMessages(args.conversationId, context.userId);
  }

  @McpTool({
    name: 'core.mcp-chat.messages.send',
    description: 'Sends a message in a conversation and returns the AI response.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: { type: 'number', description: 'Conversation ID' },
        message: { type: 'string', description: 'Message to send' },
      },
      required: ['conversationId', 'message'],
    },
  })
  async sendMessage(args: { conversationId: number; message: string }, context: McpContext): Promise<any> {
    return this.mcpChatService.sendMessage(args.conversationId, context.userId, context.locale, args.message);
  }
}
