import { Injectable } from '@nestjs/common';
import { SystemService } from '../../core/system.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreSystemMcpTools {
  constructor(private readonly systemService: SystemService) {}

  @McpTool({
    name: 'core.system.info',
    description: 'Returns system information including OS, database, modules, and disk usage. Admin only.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getSystemInfo(_args: Record<string, any>, _context: McpContext): Promise<any> {
    return this.systemService.index();
  }
}
