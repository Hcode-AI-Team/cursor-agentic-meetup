import { PageOrderDirection, PaginationService } from '@hed-hog/api-pagination';
import { Prisma, PrismaService } from '@hed-hog/api-prisma';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import * as geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

interface RecordHttpData {
  userId?: number;
  ip?: string;
  userAgent?: string;
  method: string;
  path: string;
}

interface RecordMcpData {
  userId?: number;
  mcpTool: string;
  mcpPrompt?: string;
}

type AccessLogListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: string;
  sortOrder?: PageOrderDirection;
  fields?: string;
  userId?: number;
  userSearch?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  type?: 'http' | 'mcp' | 'all';
};

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly pagination: PaginationService,
  ) {}

  recordHttp(data: RecordHttpData): void {
    this.prisma.access_log
      .create({
        data: {
          user_id: data.userId ?? null,
          ip: data.ip ?? null,
          user_agent: data.userAgent ?? null,
          method: data.method,
          path: data.path,
        },
      })
      .catch((e) => this.logger.warn(`Failed to persist HTTP access log: ${e.message}`));
  }

  recordMcp(data: RecordMcpData): void {
    this.prisma.access_log
      .create({
        data: {
          user_id: data.userId ?? null,
          mcp_tool: data.mcpTool,
          mcp_prompt: data.mcpPrompt ?? null,
        },
      })
      .catch((e) => this.logger.warn(`Failed to persist MCP access log: ${e.message}`));
  }

  async list(params: AccessLogListParams) {
    const where: Prisma.access_logWhereInput = {};

    if (params.userId) {
      where.user_id = params.userId;
    }

    if (params.userSearch) {
      where.user = {
        OR: [
          { name: { contains: params.userSearch, mode: 'insensitive' } },
        ],
      };
    }

    if (params.createdAtFrom || params.createdAtTo) {
      where.created_at = {};
      if (params.createdAtFrom) {
        where.created_at.gte = new Date(params.createdAtFrom);
      }
      if (params.createdAtTo) {
        const to = new Date(params.createdAtTo);
        to.setHours(23, 59, 59, 999);
        where.created_at.lte = to;
      }
    }

    if (params.type === 'http') {
      where.method = { not: null };
    } else if (params.type === 'mcp') {
      where.mcp_tool = { not: null };
    }

    const result = await this.pagination.paginate(this.prisma.access_log, {
      ...params,
      fields: params.fields ?? '',
    }, {
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, photo_id: true } },
      },
    });

    const data = (result.data as any[]).map((log) => {
      const ua = log.user_agent ? new UAParser(log.user_agent).getResult() : null;
      const geo = log.ip ? geoip.lookup(log.ip) : null;
      return {
        ...log,
        browser_name: ua?.browser?.name ?? null,
        browser_version: ua?.browser?.version ?? null,
        os_name: ua?.os?.name ?? null,
        os_version: ua?.os?.version ?? null,
        country: geo?.country ?? null,
        city: geo?.city ?? null,
      };
    });

    return { ...result, data };
  }

  async clearOld(retentionDays: number, batchLimit: number): Promise<void> {
    await this.prisma.$executeRaw`
      WITH del AS (
        SELECT id
        FROM access_log
        WHERE created_at < (now() - ${Prisma.sql`INTERVAL '${Prisma.raw(String(retentionDays))} days'`})
        ORDER BY id
        LIMIT ${batchLimit}
      )
      DELETE FROM access_log al
      USING del
      WHERE al.id = del.id
    `;
  }
}
