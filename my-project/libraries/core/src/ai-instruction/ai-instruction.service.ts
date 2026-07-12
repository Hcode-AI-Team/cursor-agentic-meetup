import { PaginationDTO } from '@hed-hog/api-pagination';
import { Prisma, PrismaService } from '@hed-hog/api-prisma';
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DeleteDTO } from '../dto/delete.dto';
import { CreateAiInstructionDTO } from './dto/create-ai-instruction.dto';
import { UpdateAiInstructionDTO } from './dto/update-ai-instruction.dto';
import type {
  AiInstructionLayer,
  AiInstructionRecord,
} from './types/ai-instruction.types';

type CacheEntry = { content: string; fetchedAt: number };

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const FALLBACK_SYSTEM_PROMPT =
  'You are a helpful assistant with access to tools from the HedHog system. ' +
  "Use the available tools to answer the user's questions accurately. " +
  'Always respond in the same language the user writes in.';

@Injectable()
export class AiInstructionService implements OnModuleInit {
  private readonly logger = new Logger(AiInstructionService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Warm up global and product layers on startup
    try {
      await this.getLayer('system');
      await this.getLayer('product');
    } catch {
      // DB may not be ready yet; cache will fill on first request
    }
  }

  // ── Public layer accessors (cached) ──────────────────────────────────────

  async getLayer(layer: AiInstructionLayer, moduleSlug?: string): Promise<string> {
    const cacheKey = moduleSlug ? `${layer}:${moduleSlug}` : layer;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.content;
    }

    const instruction = await this.findActiveByLayer(layer, moduleSlug);
    if (!instruction) {
      if (layer === 'system') {
        return FALLBACK_SYSTEM_PROMPT;
      }
      return '';
    }

    this.cache.set(cacheKey, { content: instruction.content, fetchedAt: Date.now() });
    return instruction.content;
  }

  async getAgentInstruction(agentSlug: string): Promise<string> {
    const cacheKey = `agent:${agentSlug}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.content;
    }

    const instruction = await this.findActiveBySlug(`agent.${agentSlug}`);
    if (!instruction) return '';

    this.cache.set(cacheKey, { content: instruction.content, fetchedAt: Date.now() });
    return instruction.content;
  }

  invalidateCache(slug?: string) {
    if (slug) {
      // Cache keys use format "layer" or "layer:identifier"
      // Slugs use format "layer.identifier" (e.g., "module.lms", "agent.admin-support")
      const dotIndex = slug.indexOf('.');
      if (dotIndex === -1) {
        this.cache.delete(slug);
      } else {
        const layer = slug.slice(0, dotIndex);
        const identifier = slug.slice(dotIndex + 1);
        this.cache.delete(layer);
        this.cache.delete(`${layer}:${identifier}`);
      }
    } else {
      this.cache.clear();
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async list(paginationParams: PaginationDTO) {
    const page = Math.max(Number(paginationParams?.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(paginationParams?.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(paginationParams?.search || '').trim();

    const whereClause = search
      ? Prisma.sql`WHERE (LOWER(slug) LIKE LOWER(${`%${search}%`}) OR LOWER(name) LIKE LOWER(${`%${search}%`}))`
      : Prisma.empty;

    const data = await this.prisma.$queryRaw<AiInstructionRecord[]>(Prisma.sql`
      SELECT id, slug, layer, name, content, variables_schema, locale, module_slug,
             is_active, version, created_at, updated_at
      FROM ai_instruction
      ${whereClause}
      ORDER BY layer, slug
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    const totalResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS total FROM ai_instruction ${whereClause}
    `);

    const total = Number(totalResult?.[0]?.total || 0);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id: number): Promise<AiInstructionRecord> {
    const record = await this.findById(id);
    if (!record) throw new NotFoundException(`AI instruction ${id} not found.`);
    return record;
  }

  async getBySlug(slug: string): Promise<AiInstructionRecord> {
    const record = await this.findActiveBySlug(slug);
    if (!record) throw new NotFoundException(`AI instruction "${slug}" not found.`);
    return record;
  }

  async create(dto: CreateAiInstructionDTO, createdById?: number) {
    const locale = dto.locale || 'en';
    const isActive = dto.is_active ?? true;

    await this.prisma.$executeRaw`
      INSERT INTO ai_instruction (slug, layer, name, content, variables_schema, locale, module_slug, is_active, version)
      VALUES (
        ${dto.slug},
        CAST(${dto.layer} AS ai_instruction_layer_enum),
        ${dto.name},
        ${dto.content},
        ${dto.variables_schema ? JSON.stringify(dto.variables_schema) : null}::jsonb,
        ${locale},
        ${dto.module_slug || null},
        ${isActive},
        1
      )
    `;

    const created = await this.findActiveBySlug(dto.slug);

    // Record version 1
    if (created) {
      await this.saveVersion(created.id, 1, dto.content, 'Initial version', createdById);
    }

    return created;
  }

  async update(id: number, dto: UpdateAiInstructionDTO, updatedById?: number) {
    const current = await this.getById(id);

    const newContent = dto.content ?? current.content;
    const newVersion = dto.content && dto.content !== current.content
      ? current.version + 1
      : current.version;

    await this.prisma.$executeRaw`
      UPDATE ai_instruction
      SET
        name             = ${dto.name ?? current.name},
        content          = ${newContent},
        variables_schema = ${dto.variables_schema !== undefined ? JSON.stringify(dto.variables_schema) : current.variables_schema ? JSON.stringify(current.variables_schema) : null}::jsonb,
        locale           = ${dto.locale ?? current.locale},
        module_slug      = ${dto.module_slug !== undefined ? dto.module_slug : current.module_slug},
        is_active        = ${dto.is_active ?? current.is_active},
        version          = ${newVersion},
        updated_at       = NOW()
      WHERE id = ${id}
    `;

    // Save new version if content changed
    if (dto.content && dto.content !== current.content) {
      await this.saveVersion(id, newVersion, newContent, dto.change_note, updatedById);
    }

    this.invalidateCache(current.slug);

    return this.getById(id);
  }

  async delete({ ids }: DeleteDTO) {
    const existing = await this.prisma.$queryRaw<Array<{ id: number; slug: string }>>(Prisma.sql`
      SELECT id, slug FROM ai_instruction WHERE id IN (${Prisma.join(ids)})
    `);

    if (existing.length !== ids.length) {
      const missing = ids.filter((id) => !existing.map((r) => r.id).includes(id));
      throw new NotFoundException(`AI instructions ${missing.join(', ')} not found.`);
    }

    await this.prisma.$executeRaw`
      DELETE FROM ai_instruction WHERE id IN (${Prisma.join(ids)})
    `;

    existing.forEach((r) => this.invalidateCache(r.slug));

    return { count: ids.length };
  }

  async listVersions(id: number) {
    await this.getById(id);
    return this.prisma.$queryRaw`
      SELECT v.id, v.version, v.content, v.change_note, v.created_at,
             u.name AS created_by_name
      FROM ai_instruction_version v
      LEFT JOIN "user" u ON u.id = v.created_by_id
      WHERE v.instruction_id = ${id}
      ORDER BY v.version DESC
    `;
  }

  async restoreVersion(id: number, version: number, restoredById?: number) {
    const versions = await this.prisma.$queryRaw<Array<{ version: number; content: string }>>`
      SELECT version, content FROM ai_instruction_version
      WHERE instruction_id = ${id} AND version = ${version}
      LIMIT 1
    `;

    if (!versions.length) {
      throw new NotFoundException(`Version ${version} not found for instruction ${id}.`);
    }

    const target = versions[0];
    const current = await this.getById(id);
    const newVersion = current.version + 1;

    await this.prisma.$executeRaw`
      UPDATE ai_instruction
      SET content = ${target.content}, version = ${newVersion}, updated_at = NOW()
      WHERE id = ${id}
    `;

    await this.saveVersion(
      id,
      newVersion,
      target.content,
      `Restored from version ${version}`,
      restoredById,
    );

    this.invalidateCache(current.slug);

    return this.getById(id);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async findById(id: number): Promise<AiInstructionRecord | null> {
    const rows = await this.prisma.$queryRaw<AiInstructionRecord[]>`
      SELECT id, slug, layer, name, content, variables_schema, locale, module_slug,
             is_active, version, created_at, updated_at
      FROM ai_instruction WHERE id = ${id} LIMIT 1
    `;
    return rows?.[0] || null;
  }

  private async findActiveBySlug(slug: string): Promise<AiInstructionRecord | null> {
    const rows = await this.prisma.$queryRaw<AiInstructionRecord[]>`
      SELECT id, slug, layer, name, content, variables_schema, locale, module_slug,
             is_active, version, created_at, updated_at
      FROM ai_instruction WHERE slug = ${slug} AND is_active = TRUE LIMIT 1
    `;
    return rows?.[0] || null;
  }

  private async findActiveByLayer(
    layer: AiInstructionLayer,
    moduleSlug?: string,
  ): Promise<AiInstructionRecord | null> {
    if (moduleSlug) {
      const rows = await this.prisma.$queryRaw<AiInstructionRecord[]>`
        SELECT id, slug, layer, name, content, variables_schema, locale, module_slug,
               is_active, version, created_at, updated_at
        FROM ai_instruction
        WHERE layer = CAST(${layer} AS ai_instruction_layer_enum)
          AND module_slug = ${moduleSlug}
          AND is_active = TRUE
        LIMIT 1
      `;
      if (rows?.[0]) return rows[0];
    }

    const rows = await this.prisma.$queryRaw<AiInstructionRecord[]>`
      SELECT id, slug, layer, name, content, variables_schema, locale, module_slug,
             is_active, version, created_at, updated_at
      FROM ai_instruction
      WHERE layer = CAST(${layer} AS ai_instruction_layer_enum)
        AND module_slug IS NULL
        AND is_active = TRUE
      LIMIT 1
    `;
    return rows?.[0] || null;
  }

  private async saveVersion(
    instructionId: number,
    version: number,
    content: string,
    changeNote?: string,
    createdById?: number,
  ) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO ai_instruction_version (instruction_id, version, content, change_note, created_by_id)
        VALUES (${instructionId}, ${version}, ${content}, ${changeNote || null}, ${createdById || null})
        ON CONFLICT (instruction_id, version) DO NOTHING
      `;
    } catch (e) {
      this.logger.warn(`Failed to save version for instruction ${instructionId}: ${e}`);
    }
  }
}
