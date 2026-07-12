import { PrismaService } from '@hed-hog/api-prisma';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { AccessLogService } from '../access-log/access-log.service';

interface AuditRecord {
  userId: number;
  toolName: string;
  input: Record<string, any>;
  success: boolean;
  error?: string;
  durationMs: number;
}

@Injectable()
export class McpAuditService {
  private readonly logger = new Logger(McpAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AccessLogService))
    private readonly accessLogService: AccessLogService,
  ) {}

  async record(data: AuditRecord): Promise<void> {
    const sanitized = JSON.stringify(data.input).slice(0, 1000);
    try {
      await this.prisma.mcp_tool_call_log.create({
        data: {
          user_id: data.userId || null,
          tool_name: data.toolName,
          input: sanitized,
          success: data.success,
          error: data.error ?? null,
          duration_ms: data.durationMs,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to persist MCP audit record: ${e.message}`);
    }

    this.accessLogService.recordMcp({
      userId: data.userId || undefined,
      mcpTool: data.toolName,
      mcpPrompt: sanitized,
    });
  }
}
