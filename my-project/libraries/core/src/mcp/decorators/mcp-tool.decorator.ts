import { SetMetadata } from '@nestjs/common';
import { McpToolDefinition } from '../interfaces/mcp-tool-definition.interface';

export const MCP_TOOL_METADATA = 'mcp:tool';

export const McpTool = (definition: McpToolDefinition): MethodDecorator =>
  SetMetadata(MCP_TOOL_METADATA, definition);
