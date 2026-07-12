import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AiInstructionService } from './ai-instruction.service';
import type { AiPromptBuildContext } from './types/ai-instruction.types';

export type BuiltPrompt = {
  systemPrompt: string;
  layers: string[];
  layerNames: string[];
};

@Injectable()
export class AiPromptBuilderService {
  constructor(
    @Inject(forwardRef(() => AiInstructionService))
    private readonly instructionService: AiInstructionService,
  ) {}

  /**
   * Composes the system prompt from active layers in priority order.
   * Only includes non-empty layers to minimize tokens.
   *
   * Layers sent:
   *  L1 system   — always
   *  L2 product  — always (if configured)
   *  L3 module   — when moduleSlug is provided
   *  L4 agent    — when agentSlug is provided
   *  runtime     — injected by caller at send time (not stored here)
   */
  async build(ctx: AiPromptBuildContext): Promise<BuiltPrompt> {
    const parts: string[] = [];
    const names: string[] = [];

    // L1 — system (always; has hardcoded fallback)
    const system = await this.instructionService.getLayer('system');
    if (system) {
      parts.push(system);
      names.push('system');
    }

    // L2 — product (optional, no fallback)
    const product = await this.instructionService.getLayer('product');
    if (product) {
      parts.push(product);
      names.push('product');
    }

    // L3 — module (only when moduleSlug provided)
    if (ctx.moduleSlug) {
      const module = await this.instructionService.getLayer('module', ctx.moduleSlug);
      if (module) {
        parts.push(module);
        names.push(`module:${ctx.moduleSlug}`);
      }
    }

    // L4 — agent (only when agentSlug provided)
    if (ctx.agentSlug) {
      const agent = await this.instructionService.getAgentInstruction(ctx.agentSlug);
      if (agent) {
        parts.push(agent);
        names.push(`agent:${ctx.agentSlug}`);
      }
    }

    const systemPrompt = parts.join('\n\n---\n\n');

    return { systemPrompt, layers: parts, layerNames: names };
  }

  /**
   * Builds a compact runtime context block (L6) to append to the system prompt.
   * This is NEVER cached — it is generated fresh per request.
   */
  buildRuntimeContext(params: {
    userId?: number;
    locale?: string;
    userRoles?: string[];
    currentDate?: string;
    extraContext?: Record<string, string>;
  }): string {
    const lines: string[] = ['[Runtime context]'];

    if (params.userId) lines.push(`user_id: ${params.userId}`);
    if (params.locale) lines.push(`locale: ${params.locale}`);
    if (params.userRoles?.length) lines.push(`roles: ${params.userRoles.join(', ')}`);
    if (params.currentDate) lines.push(`date: ${params.currentDate}`);

    if (params.extraContext) {
      for (const [k, v] of Object.entries(params.extraContext)) {
        lines.push(`${k}: ${v}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Builds a compact history summary for older messages to avoid
   * sending full history on every turn.
   *
   * @param messages All conversation messages
   * @param keepLast How many recent messages to keep verbatim
   */
  summarizeHistory(
    messages: Array<{ role: string; content: string }>,
    keepLast = 6,
  ): Array<{ role: string; content: string }> {
    if (messages.length <= keepLast) return messages;

    const older = messages.slice(0, messages.length - keepLast);
    const recent = messages.slice(messages.length - keepLast);

    // Simple extractive summary: keep first user turn + count of exchanges
    const userMessages = older.filter((m) => m.role === 'user');
    const toolCount = older.filter((m) => m.role === 'tool_call').length;

    const summaryLines: string[] = [
      `[Earlier conversation summary: ${older.length} messages]`,
    ];

    if (userMessages[0]) {
      summaryLines.push(`First question: "${userMessages[0].content.slice(0, 120)}"`);
    }
    if (toolCount > 0) {
      summaryLines.push(`Tools called: ${toolCount}`);
    }

    const summaryMessage = {
      role: 'user',
      content: summaryLines.join('\n'),
    };

    return [summaryMessage, ...recent];
  }

  /**
   * Interpolates {{variable}} placeholders in a template string.
   */
  interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  }
}
