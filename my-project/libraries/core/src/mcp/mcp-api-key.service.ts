import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SecurityService } from '../security/security.service';

@Injectable()
export class McpApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly security: SecurityService,
    private readonly pagination: PaginationService,
  ) {}

  async list(userId: number, paginationParams: PaginationDTO) {
    return this.pagination.paginatePrismaModel(this.prisma.mcp_api_key, {
      ...paginationParams,
      where: { user_id: userId, revoked_at: null },
      select: {
        id: true,
        name: true,
        type: true,
        token_prefix: true,
        last_used_at: true,
        expires_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(userId: number, name: string, type: 'mcp' | 'api' = 'mcp') {
    const prefix = type === 'api' ? 'hedhog_api_' : 'hedhog_mcp_';
    const rawToken = prefix + this.security.randomOpaque(36);
    const tokenHash = this.security.hashWithPepper(rawToken);
    const tokenPrefix = rawToken.substring(0, 16);

    const record = await this.prisma.mcp_api_key.create({
      data: {
        user_id: userId,
        name,
        type,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
      },
      select: {
        id: true,
        name: true,
        type: true,
        token_prefix: true,
        created_at: true,
      },
    });

    return { ...record, rawToken };
  }

  async revoke(userId: number, id: number) {
    const key = await this.prisma.mcp_api_key.findFirst({
      where: { id, user_id: userId },
    });
    if (!key) {
      throw new NotFoundException(`MCP API key ${id} not found`);
    }
    await this.prisma.mcp_api_key.update({
      where: { id },
      data: { revoked_at: new Date() },
    });
    return { success: true };
  }
}
