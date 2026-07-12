import { PrismaService } from '@hed-hog/api-prisma';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AiExecutionRecord,
  AiExecutionStepType,
  AiExecutionTrigger,
  AiModelPricingRecord,
  AiTokenUsage,
} from './types/ai-instruction.types';

export type StartExecutionParams = {
  userId?: number;
  conversationId?: number;
  agentId?: number;
  trigger?: AiExecutionTrigger;
  contextSlug?: string;
};

export type RecordStepParams = {
  executionId: number;
  stepOrder: number;
  type: AiExecutionStepType;
  provider?: string;
  model?: string;
  toolName?: string;
  usage?: AiTokenUsage;
  durationMs?: number;
  inputSummary?: string;
  outputSummary?: string;
  success?: boolean;
  error?: string;
};

@Injectable()
export class AiExecutionService {
  private readonly logger = new Logger(AiExecutionService.name);
  private readonly pricingCache = new Map<string, AiModelPricingRecord>();
  private pricingLoadedAt = 0;
  private readonly PRICING_TTL_MS = 60 * 60 * 1000; // 1h

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
  ) {}

  async start(params: StartExecutionParams): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ id: number }>>`
        INSERT INTO ai_execution (user_id, conversation_id, agent_id, trigger, status, context_slug, started_at)
        VALUES (
          ${params.userId ?? null},
          ${params.conversationId ?? null},
          ${params.agentId ?? null},
          CAST(${params.trigger ?? 'manual'} AS ai_execution_trigger_enum),
          'running',
          ${params.contextSlug ?? null},
          NOW()
        )
        RETURNING id
      `;
      return result[0].id;
    } catch (e) {
      this.logger.warn(`Failed to start execution record: ${e}`);
      return 0;
    }
  }

  async recordStep(params: RecordStepParams): Promise<void> {
    if (!params.executionId) return;

    try {
      const costUsd = await this.estimateCost(
        params.provider,
        params.model,
        params.usage,
      );

      await this.prisma.$executeRaw`
        INSERT INTO ai_execution_step (
          execution_id, step_order, type, provider, model, tool_name,
          tokens_input, tokens_output, cost_usd, duration_ms,
          input_summary, output_summary, success, error
        ) VALUES (
          ${params.executionId},
          ${params.stepOrder},
          CAST(${params.type} AS ai_execution_step_type_enum),
          ${params.provider ?? null},
          ${params.model ?? null},
          ${params.toolName ?? null},
          ${params.usage?.input ?? 0},
          ${params.usage?.output ?? 0},
          ${costUsd},
          ${params.durationMs ?? 0},
          ${params.inputSummary ? params.inputSummary.slice(0, 500) : null},
          ${params.outputSummary ? params.outputSummary.slice(0, 500) : null},
          ${params.success ?? true},
          ${params.error ?? null}
        )
      `;
    } catch (e) {
      this.logger.warn(`Failed to record execution step: ${e}`);
    }
  }

  async finish(
    executionId: number,
    status: 'completed' | 'failed' | 'cancelled',
    error?: string,
  ): Promise<void> {
    if (!executionId) return;

    try {
      // Aggregate totals from steps
      const totals = await this.prisma.$queryRaw<
        Array<{ tokens_input: bigint; tokens_output: bigint; cost_usd: string }>
      >`
        SELECT
          SUM(tokens_input)  AS tokens_input,
          SUM(tokens_output) AS tokens_output,
          SUM(cost_usd)      AS cost_usd
        FROM ai_execution_step
        WHERE execution_id = ${executionId}
      `;

      const t = totals[0];
      const tokensInput = Number(t?.tokens_input || 0);
      const tokensOutput = Number(t?.tokens_output || 0);
      const costUsd = parseFloat(String(t?.cost_usd || 0));

      await this.prisma.$executeRaw`
        UPDATE ai_execution
        SET
          status        = CAST(${status} AS ai_execution_status_enum),
          tokens_input  = ${tokensInput},
          tokens_output = ${tokensOutput},
          tokens_total  = ${tokensInput + tokensOutput},
          cost_usd      = ${costUsd},
          finished_at   = NOW(),
          error         = ${error ?? null},
          updated_at    = NOW()
        WHERE id = ${executionId}
      `;
    } catch (e) {
      this.logger.warn(`Failed to finish execution record ${executionId}: ${e}`);
    }
  }

  async getExecution(executionId: number): Promise<AiExecutionRecord | null> {
    const rows = await this.prisma.$queryRaw<AiExecutionRecord[]>`
      SELECT * FROM ai_execution WHERE id = ${executionId} LIMIT 1
    `;
    return rows?.[0] || null;
  }

  async listExecutions(params: {
    userId?: number;
    contextSlug?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = params.offset ?? 0;

    // Use parameterized queries to prevent SQL injection
    if (params.userId !== undefined && params.contextSlug !== undefined) {
      return this.prisma.$queryRaw<AiExecutionRecord[]>`
        SELECT * FROM ai_execution
        WHERE user_id = ${params.userId} AND context_slug = ${params.contextSlug}
        ORDER BY started_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    }
    if (params.userId !== undefined) {
      return this.prisma.$queryRaw<AiExecutionRecord[]>`
        SELECT * FROM ai_execution
        WHERE user_id = ${params.userId}
        ORDER BY started_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    }
    if (params.contextSlug !== undefined) {
      return this.prisma.$queryRaw<AiExecutionRecord[]>`
        SELECT * FROM ai_execution
        WHERE context_slug = ${params.contextSlug}
        ORDER BY started_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    }
    return this.prisma.$queryRaw<AiExecutionRecord[]>`
      SELECT * FROM ai_execution
      ORDER BY started_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }

  // ── Cost estimation ───────────────────────────────────────────────────────

  private async estimateCost(
    provider?: string,
    model?: string,
    usage?: AiTokenUsage,
  ): Promise<number> {
    if (!provider || !model || !usage || (!usage.input && !usage.output)) {
      return 0;
    }

    const pricing = await this.getPricing(provider, model);
    if (!pricing) return 0;

    const inputCost = (usage.input / 1_000_000) * Number(pricing.price_input_per_million);
    const outputCost = (usage.output / 1_000_000) * Number(pricing.price_output_per_million);
    const cachedCost =
      usage.cached && pricing.price_cached_input_per_million
        ? (usage.cached / 1_000_000) * Number(pricing.price_cached_input_per_million)
        : 0;

    return parseFloat((inputCost + outputCost + cachedCost).toFixed(8));
  }

  private async getPricing(provider: string, model: string): Promise<AiModelPricingRecord | null> {
    const key = `${provider}:${model}`;

    if (Date.now() - this.pricingLoadedAt > this.PRICING_TTL_MS) {
      await this.loadPricingCache();
    }

    return this.pricingCache.get(key) || null;
  }

  private async loadPricingCache() {
    try {
      const rows = await this.prisma.$queryRaw<AiModelPricingRecord[]>`
        SELECT * FROM ai_model_pricing WHERE is_active = TRUE ORDER BY valid_from DESC
      `;
      this.pricingCache.clear();
      for (const row of rows) {
        const key = `${row.provider}:${row.model}`;
        // Only keep the most recent pricing entry per provider+model
        if (!this.pricingCache.has(key)) {
          this.pricingCache.set(key, row);
        }
      }
      this.pricingLoadedAt = Date.now();
    } catch (e) {
      this.logger.warn(`Failed to load pricing cache: ${e}`);
    }
  }
}
