import { Injectable } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreAiMcpTools {
  constructor(private readonly aiService: AiService) {}

  @McpTool({
    name: 'core.ai.chat',
    description: 'Sends a message to the AI and returns a response.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to send to the AI' },
        context: { type: 'string', description: 'Additional context for the AI' },
      },
      required: ['message'],
    },
  })
  async chat(args: { message: string; context?: string }, _context: McpContext): Promise<any> {
    return this.aiService.chat({ message: args.message, context: args.context } as any);
  }

  @McpTool({
    name: 'core.ai.agents.list',
    description: 'Lists AI agents with optional pagination. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        search: { type: 'string', description: 'Search term' },
        sortField: { type: 'string', description: 'Field to sort by' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
      },
    },
    readOnly: true,
  })
  async listAgents(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    _context: McpContext,
  ): Promise<any> {
    return this.aiService.listAgents({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.ai.agents.get',
    description: 'Returns a single AI agent by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'number', description: 'Agent ID' },
      },
      required: ['agentId'],
    },
    readOnly: true,
  })
  async getAgent(args: { agentId: number }, _context: McpContext): Promise<any> {
    return this.aiService.getAgentById(args.agentId);
  }

  @McpTool({
    name: 'core.ai.agents.get-by-slug',
    description: 'Returns a single AI agent by slug.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Agent slug' },
      },
      required: ['slug'],
    },
    readOnly: true,
  })
  async getAgentBySlug(args: { slug: string }, _context: McpContext): Promise<any> {
    return this.aiService.getAgentBySlug(args.slug);
  }

  @McpTool({
    name: 'core.ai.agents.create',
    description: 'Creates a new AI agent. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Agent slug (unique identifier)' },
        provider: { type: 'string', description: 'AI provider (e.g. openai, gemini)' },
        model: { type: 'string', description: 'AI model identifier' },
        instructions: { type: 'string', description: 'System instructions for the agent' },
      },
      required: ['slug'],
    },
  })
  async createAgent(args: { slug: string; provider?: string; model?: string; instructions?: string }, _context: McpContext): Promise<any> {
    return this.aiService.createAgent(args as any);
  }

  @McpTool({
    name: 'core.ai.agents.update',
    description: 'Updates an existing AI agent by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'number', description: 'Agent ID' },
        slug: { type: 'string', description: 'New slug' },
        provider: { type: 'string', description: 'New AI provider' },
        model: { type: 'string', description: 'New AI model' },
        instructions: { type: 'string', description: 'New system instructions' },
      },
      required: ['agentId'],
    },
  })
  async updateAgent(args: { agentId: number; slug?: string; provider?: string; model?: string; instructions?: string }, _context: McpContext): Promise<any> {
    const { agentId, ...data } = args;
    return this.aiService.updateAgent(agentId, data as any);
  }

  @McpTool({
    name: 'core.ai.agents.delete',
    description: 'Deletes one or more AI agents by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Agent IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteAgents(args: { ids: number[] }, _context: McpContext): Promise<any> {
    return this.aiService.deleteAgents({ ids: args.ids });
  }

  @McpTool({
    name: 'core.ai.agents.chat',
    description: 'Sends a message to a specific AI agent and returns a response.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Agent slug' },
        message: { type: 'string', description: 'Message to send to the agent' },
        context: { type: 'string', description: 'Additional context for the agent' },
      },
      required: ['slug', 'message'],
    },
  })
  async chatWithAgent(args: { slug: string; message: string; context?: string }, _context: McpContext): Promise<any> {
    return this.aiService.chatWithAgent(args.slug, { message: args.message, context: args.context } as any);
  }
}
