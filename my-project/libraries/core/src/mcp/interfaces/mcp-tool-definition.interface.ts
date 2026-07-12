export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  readOnly?: boolean;
}
