import { NoRole } from '@hed-hog/api';
import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { SettingService } from '../setting/setting.service';
import { AllowMcpToken } from './decorators/allow-mcp-token.decorator';
import { McpAuthGuard } from './guards/mcp-auth.guard';
import { McpPermissionGuard } from './guards/mcp-permission.guard';
import { McpServerService } from './mcp-server.service';

@NoRole()
@AllowMcpToken()
@UseGuards(McpAuthGuard, McpPermissionGuard)
@Controller('mcp')
export class McpController {
  constructor(
    private readonly mcpServer: McpServerService,
    private readonly setting: SettingService,
  ) {}

  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const settings = await this.setting.getSettingValues(['mcp-enabled']);
    if (settings['mcp-enabled'] === false) {
      res.status(503).json({ message: 'MCP server is disabled.' });
      return;
    }

    const auth = (req as any).auth;
    const locale =
      req.headers['accept-language']?.split(',')[0]?.split('-')[0] ?? 'en';
    const body = req.body as any;
    const toolName: string =
      body?.method === 'tools/call' ? (body?.params?.name ?? '') : '';

    await this.mcpServer.handleRequest(req, res, {
      userId: auth.sub,
      sessionId: String(auth.sessionId),
      locale,
      toolName,
    });
  }
}
