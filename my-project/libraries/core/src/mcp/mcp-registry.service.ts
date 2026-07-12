import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { MCP_TOOL_METADATA } from './decorators/mcp-tool.decorator';
import { McpToolDefinition } from './interfaces/mcp-tool-definition.interface';
import { McpContext } from './types/mcp-context.type';

export interface McpToolEntry {
  definition: McpToolDefinition;
  handler: (args: Record<string, any>, context: McpContext) => Promise<any>;
}

@Injectable()
export class McpRegistryService implements OnModuleInit {
  private readonly logger = new Logger(McpRegistryService.name);
  private readonly tools = new Map<string, McpToolEntry>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') continue;

      const prototype = Object.getPrototypeOf(instance);
      if (!prototype) continue;

      const methodNames = Object.getOwnPropertyNames(prototype).filter((key) => {
        if (key === 'constructor') return false;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        return descriptor !== undefined && typeof descriptor.value === 'function';
      });

      for (const methodName of methodNames) {
        const definition = this.reflector.get<McpToolDefinition>(
          MCP_TOOL_METADATA,
          prototype[methodName],
        );

        if (!definition) continue;

        if (this.tools.has(definition.name)) {
          this.logger.warn(
            `Duplicate MCP tool ignored: ${definition.name} from ${prototype.constructor?.name}.${methodName}`,
          );
          continue;
        }

        this.logger.log(`Registered MCP tool: ${definition.name}`);
        this.tools.set(definition.name, {
          definition,
          handler: (instance as any)[methodName].bind(instance),
        });
      }
    }

    this.logger.log(`McpRegistryService: ${this.tools.size} tools registered`);
  }

  getAll(): McpToolEntry[] {
    return Array.from(this.tools.values());
  }

  get(toolName: string): McpToolEntry | undefined {
    return this.tools.get(toolName);
  }

  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }
}
