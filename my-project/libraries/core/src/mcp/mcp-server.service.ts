import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpAuditService } from './mcp-audit.service';
import { McpRegistryService } from './mcp-registry.service';
import { McpContext } from './types/mcp-context.type';

@Injectable()
export class McpServerService {
  constructor(
    private readonly registry: McpRegistryService,
    private readonly audit: McpAuditService,
  ) {}

  async handleRequest(req: Request, res: Response, context: McpContext): Promise<void> {
    const server = this.buildServer(context);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  private buildServer(context: McpContext): Server {
    const server = new Server(
      { name: 'hedhog-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.registry.getAll().map((e) => ({
        name: e.definition.name,
        description: e.definition.description,
        inputSchema: e.definition.inputSchema ?? {
          type: 'object',
          properties: {},
        },
      })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = (request.params.arguments ?? {}) as Record<string, any>;
      const entry = this.registry.get(toolName);

      if (!entry) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Tool '${toolName}' not found` }],
        };
      }

      const start = Date.now();
      try {
        const result = await entry.handler(args, { ...context, toolName });
        await this.audit.record({
          userId: context.userId,
          toolName,
          input: args,
          success: true,
          durationMs: Date.now() - start,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (e: any) {
        await this.audit.record({
          userId: context.userId,
          toolName,
          input: args,
          success: false,
          error: e.message,
          durationMs: Date.now() - start,
        });
        return {
          isError: true,
          content: [{ type: 'text', text: e.message }],
        };
      }
    });

    return server;
  }
}
