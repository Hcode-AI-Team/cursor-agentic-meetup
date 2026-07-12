import { SetMetadata } from '@nestjs/common';

export const ALLOW_MCP_TOKEN = 'allowMcpToken';

export function AllowMcpToken() {
  return SetMetadata(ALLOW_MCP_TOKEN, true);
}
