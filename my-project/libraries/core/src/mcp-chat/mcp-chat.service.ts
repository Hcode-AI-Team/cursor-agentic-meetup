import { PrismaService } from '@hed-hog/api-prisma';
import {
    BadRequestException,
    ForbiddenException,
    forwardRef,
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { AiExecutionService } from '../ai-instruction/ai-execution.service';
import { AiPromptBuilderService } from '../ai-instruction/ai-prompt-builder.service';
import { buildAiConfigFromIntegration } from '../integration-profile/integration-profile.utils';
import { McpRegistryService, McpToolEntry } from '../mcp/mcp-registry.service';
import { McpContext } from '../mcp/types/mcp-context.type';
import { SettingService } from '../setting/setting.service';
import { CreateConversationDTO } from './dto/create-conversation.dto';

type OpenAiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAiToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, any> };
  functionResponse?: { name: string; response: { output: string } };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface ScoredTool {
  name: string;
  domain: string;
  readOnly: boolean;
  priorityBucket: number;
  keywordBoost: number;
  matchScore: number;
  index: number;
  tool: OpenAiToolDefinition;
}

interface ToolSelectionResult<TTool> {
  tools: TTool[];
  clarification?: string;
}

type ConversationHistoryItem = {
  role: string;
  content: string;
  tool_name: string | null;
  tool_call_id: string | null;
};

const MAX_OPENAI_TOOLS = 128;
const TARGET_SELECTED_TOOLS = 112;
const MAX_ITERATIONS = 20;
// Maximum number of history messages to send per turn.
// Older messages beyond this window are dropped to limit prompt tokens.
const HISTORY_MESSAGE_LIMIT = 40;
const FORCE_FINISH_THRESHOLD = 2;
const MIN_DOMAIN_CONFIDENCE = 2;
const AMBIGUOUS_DOMAIN_DELTA = 1;

// SYSTEM_PROMPT is now managed via AiInstructionService (slug: system.global).
// This fallback is used only if the DB is unreachable during startup.
const SYSTEM_PROMPT_FALLBACK =
  'You are a helpful assistant with access to tools from the HedHog system. ' +
  "Use the available tools to answer the user's questions accurately. " +
  'Always respond in the same language the user writes in.';

const sanitize = (n: string) => n.replace(/\./g, '__');
const restore = (n: string) => n.replace(/__/g, '.');

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  finance: [
    'finance',
    'financeiro',
    'financeira',
    'financas',
    'finanças',
    'banco',
    'bancos',
    'bank',
    'banks',
    'conta',
    'contas',
    'account',
    'accounts',
    'conta bancaria',
    'contas bancarias',
    'conta bancária',
    'contas bancárias',
    'extrato',
    'extratos',
    'statement',
    'statements',
    'pagamento',
    'pagamentos',
    'payment',
    'payments',
    'recebimento',
    'recebimentos',
    'receivable',
    'payable',
    'currency',
    'moeda',
    'transferencia',
    'transferência',
  ],
  operations: [
    'operations',
    'operacoes',
    'operações',
    'tarefa',
    'tarefas',
    'task',
    'tasks',
    'projeto',
    'projetos',
    'project',
    'projects',
    'timesheet',
    'apontamento',
    'aprovacao',
    'aprovação',
    'approval',
    'colaborador',
    'collaborator',
  ],
  lms: [
    'lms',
    'curso',
    'cursos',
    'course',
    'courses',
    'aula',
    'aulas',
    'lesson',
    'lessons',
    'treinamento',
    'training',
    'turma',
    'class',
    'aluno',
    'student',
    'prova',
    'exam',
  ],
  core: [
    'core',
    'usuario',
    'usuário',
    'usuarios',
    'usuários',
    'user',
    'users',
    'perfil',
    'profile',
    'role',
    'roles',
    'menu',
    'menus',
    'rota',
    'rotas',
    'route',
    'routes',
    'configuracao',
    'configuração',
    'setting',
    'settings',
  ],
  contact: [
    'contato',
    'contatos',
    'contact',
    'contacts',
    'pessoa',
    'pessoas',
    'person',
    'proposal',
    'proposta',
  ],
};

const ACTION_KEYWORDS = [
  'listar',
  'lista',
  'buscar',
  'procurar',
  'consultar',
  'mostrar',
  'ver',
  'criar',
  'adicionar',
  'atualizar',
  'alterar',
  'remover',
  'deletar',
  'excluir',
  'list',
  'search',
  'find',
  'show',
  'get',
  'create',
  'add',
  'update',
  'delete',
  'remove',
];

@Injectable()
export class McpChatService {
  private readonly logger = new Logger(McpChatService.name);

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    @Inject(forwardRef(() => McpRegistryService))
    private readonly registry: McpRegistryService,
    @Inject(forwardRef(() => AiPromptBuilderService))
    private readonly promptBuilder: AiPromptBuilderService,
    @Inject(forwardRef(() => AiExecutionService))
    private readonly aiExecution: AiExecutionService,
  ) {}

  async listConversations(userId: number) {
    return this.prisma.mcp_conversation.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: { id: true, title: true, created_at: true, updated_at: true },
    });
  }

  async createConversation(userId: number, dto: CreateConversationDTO) {
    return this.prisma.mcp_conversation.create({
      data: {
        user_id: userId,
        title: dto.title ?? null,
      },
    });
  }

  async deleteConversations(userId: number, ids: number[]) {
    await this.prisma.mcp_conversation.deleteMany({
      where: { id: { in: ids }, user_id: userId },
    });
    return { count: ids.length };
  }

  async getMessages(conversationId: number, userId: number) {
    await this.assertOwnership(conversationId, userId);
    return this.prisma.mcp_conversation_message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
  }

  async sendMessage(
    conversationId: number,
    userId: number,
    locale: string,
    message: string,
  ) {
    const cfg = await this.setting.getSettingValues(['mcp-enabled']);
    if (cfg['mcp-enabled'] === false) {
      throw new BadRequestException('MCP server is disabled.');
    }

    await this.assertOwnership(conversationId, userId);

    const { provider, apiKey } = await this.getProviderKey();

    // Save user message
    await this.prisma.mcp_conversation_message.create({
      data: {
        conversation_id: conversationId,
        role: 'user',
        content: message,
      },
    });

    // Auto-set title on first message
    const conv = await this.prisma.mcp_conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv!.title) {
      await this.prisma.mcp_conversation.update({
        where: { id: conversationId },
        data: { title: message.slice(0, 60) },
      });
    }

    const executionId = await this.aiExecution.start({
      userId,
      conversationId,
      trigger: 'manual',
      contextSlug: 'mcp-chat',
    });

    try {
      if (provider === 'gemini') {
        return await this.runGeminiLoop(conversationId, userId, locale, message, apiKey, executionId);
      }
      return await this.runOpenAiLoop(conversationId, userId, locale, message, apiKey, executionId);
    } catch (err) {
      await this.aiExecution.finish(executionId, 'failed', String(err));
      throw err;
    }
  }

  private async getSystemPrompt(locale?: string): Promise<string> {
    try {
      const built = await this.promptBuilder.build({
        locale,
      });
      return built.systemPrompt || SYSTEM_PROMPT_FALLBACK;
    } catch {
      return SYSTEM_PROMPT_FALLBACK;
    }
  }

  // ── OpenAI loop ──────────────────────────────────────────────────────────

  private async runOpenAiLoop(
    conversationId: number,
    userId: number,
    locale: string,
    message: string,
    apiKey: string,
    executionId: number,
  ) {
    const systemPrompt = await this.getSystemPrompt(locale);

    const allHistory = await this.prisma.mcp_conversation_message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
    // Limit to the most recent messages to avoid token explosion on long conversations.
    // We take the tail rather than summarize to ensure tool_call/tool_result pairs stay intact.
    const history = allHistory.length > HISTORY_MESSAGE_LIMIT
      ? allHistory.slice(allHistory.length - HISTORY_MESSAGE_LIMIT)
      : allHistory;

    const openAiMessages: OpenAiMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.toOpenAiMessages(history),
    ];

    const toolSelection = await this.buildOpenAiTools(
      message,
      conversationId,
      userId,
      history,
    );
    if (toolSelection.clarification) {
      return this.recordAssistantAndReturnHistory(
        conversationId,
        toolSelection.clarification,
      );
    }
    const tools = toolSelection.tools;

    const callSignatures = new Set<string>();
    let stepOrder = 0;
    let maxIterations = MAX_ITERATIONS;
    while (maxIterations-- > 0) {
      const forceFinish = maxIterations < FORCE_FINISH_THRESHOLD;
      let response: any;
      const stepStart = Date.now();
      try {
        response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: openAiMessages,
            tools: !forceFinish && tools.length > 0 ? tools : undefined,
            tool_choice: !forceFinish && tools.length > 0 ? 'auto' : undefined,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
      } catch (err: any) {
        const status = err?.response?.status;
        const errBody = err?.response?.data?.error;
        if (status === 429) {
          throw new HttpException(
            errBody?.message ?? 'OpenAI rate limit exceeded. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        if (status === 401) {
          throw new BadRequestException('Invalid OpenAI API key.');
        }
        throw new HttpException(
          errBody?.message ?? 'OpenAI API error.',
          status ?? HttpStatus.BAD_GATEWAY,
        );
      }

      const usage = response.data?.usage;
      await this.aiExecution.recordStep({
        executionId,
        stepOrder: stepOrder++,
        type: 'prompt',
        provider: 'openai',
        model: 'gpt-4o-mini',
        durationMs: Date.now() - stepStart,
        usage: usage
          ? { input: usage.prompt_tokens ?? 0, output: usage.completion_tokens ?? 0, total: usage.total_tokens ?? 0 }
          : undefined,
        inputSummary: openAiMessages[openAiMessages.length - 1]?.content?.toString()?.slice(0, 200),
      });

      const choice = response.data?.choices?.[0];
      const assistantMsg = choice?.message;

      if (assistantMsg?.tool_calls?.length && !forceFinish) {
        openAiMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: assistantMsg.tool_calls,
        });

        for (const toolCall of assistantMsg.tool_calls as OpenAiToolCall[]) {
          const originalName = restore(toolCall.function.name);
          const argsJson = toolCall.function.arguments;
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(argsJson);
          } catch {
            args = {};
          }

          await this.prisma.mcp_conversation_message.create({
            data: {
              conversation_id: conversationId,
              role: 'tool_call',
              content: argsJson,
              tool_name: originalName,
              tool_call_id: toolCall.id,
            },
          });

          const sig = `${toolCall.function.name}:${argsJson}`;
          if (callSignatures.has(sig)) {
            this.logger.warn(
              `MCP chat duplicate tool call detected — aborting re-execution. ` +
                `conversationId=${conversationId} tool=${originalName}`,
            );
            const dupResult = JSON.stringify({ error: 'Duplicate tool call detected, aborting loop.' });
            await this.prisma.mcp_conversation_message.create({
              data: {
                conversation_id: conversationId,
                role: 'tool_result',
                content: dupResult,
                tool_name: originalName,
                tool_call_id: toolCall.id,
              },
            });
            openAiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: dupResult,
            });
            continue;
          }
          callSignatures.add(sig);

          let resultContent: string;
          const entry = this.registry.get(originalName);
          if (entry) {
            const context: McpContext = {
              userId,
              sessionId: '',
              locale,
              toolName: originalName,
            };
            try {
              const result = await entry.handler(args, context);
              resultContent = JSON.stringify(result);
            } catch (e: any) {
              resultContent = JSON.stringify({ error: e.message });
            }
          } else {
            resultContent = JSON.stringify({ error: `Tool '${originalName}' not found` });
          }

          await this.prisma.mcp_conversation_message.create({
            data: {
              conversation_id: conversationId,
              role: 'tool_result',
              content: resultContent,
              tool_name: originalName,
              tool_call_id: toolCall.id,
            },
          });

          openAiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: resultContent,
          });
        }

        continue;
      }

      const finalContent: string = assistantMsg?.content || '';
      await this.prisma.mcp_conversation_message.create({
        data: {
          conversation_id: conversationId,
          role: 'assistant',
          content: finalContent,
        },
      });

      await this.aiExecution.finish(executionId, 'completed');

      return this.prisma.mcp_conversation_message.findMany({
        where: { conversation_id: conversationId },
        orderBy: { created_at: 'asc' },
      });
    }

    await this.aiExecution.finish(executionId, 'failed', 'Maximum tool call iterations exceeded.');
    throw new BadRequestException('Maximum tool call iterations exceeded.');
  }

  // ── Gemini loop ──────────────────────────────────────────────────────────

  private async runGeminiLoop(
    conversationId: number,
    userId: number,
    locale: string,
    message: string,
    apiKey: string,
    executionId: number,
  ) {
    const systemPrompt = await this.getSystemPrompt(locale);

    const allHistory = await this.prisma.mcp_conversation_message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
    const history = allHistory.length > HISTORY_MESSAGE_LIMIT
      ? allHistory.slice(allHistory.length - HISTORY_MESSAGE_LIMIT)
      : allHistory;

    const geminiContents: GeminiContent[] = this.toGeminiContents(history);
    const toolSelection = await this.buildGeminiTools(
      message,
      conversationId,
      userId,
      history,
    );
    if (toolSelection.clarification) {
      await this.aiExecution.finish(executionId, 'completed');
      return this.recordAssistantAndReturnHistory(
        conversationId,
        toolSelection.clarification,
      );
    }
    const functionDeclarations = toolSelection.tools;

    let stepOrder = 0;
    let maxIterations = MAX_ITERATIONS;
    let callIndex = 0;

    while (maxIterations-- > 0) {
      const forceFinish = maxIterations < FORCE_FINISH_THRESHOLD;
      let response: any;
      const stepStart = Date.now();
      try {
        response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: geminiContents,
            tools:
              !forceFinish && functionDeclarations.length > 0
                ? [{ functionDeclarations }]
                : undefined,
          },
          { headers: { 'Content-Type': 'application/json' } },
        );
      } catch (err: any) {
        const status = err?.response?.status;
        const errData = err?.response?.data;
        if (status === 429) {
          throw new HttpException(
            errData?.error?.message ?? 'Gemini rate limit exceeded. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        if (status === 400) {
          throw new BadRequestException(
            errData?.error?.message ?? 'Invalid Gemini API request.',
          );
        }
        if (status === 401 || status === 403) {
          throw new BadRequestException('Invalid Gemini API key.');
        }
        throw new HttpException(
          errData?.error?.message ?? 'Gemini API error.',
          status ?? HttpStatus.BAD_GATEWAY,
        );
      }

      const geminiUsage = response.data?.usageMetadata;
      await this.aiExecution.recordStep({
        executionId,
        stepOrder: stepOrder++,
        type: 'prompt',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        durationMs: Date.now() - stepStart,
        usage: geminiUsage
          ? { input: geminiUsage.promptTokenCount ?? 0, output: geminiUsage.candidatesTokenCount ?? 0, total: geminiUsage.totalTokenCount ?? 0 }
          : undefined,
      });

      const candidate = response.data?.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts ?? [];

      const functionCallParts = parts.filter((p) => p.functionCall);
      const textParts = parts.filter((p) => p.text);

      if (functionCallParts.length > 0 && !forceFinish) {
        geminiContents.push({ role: 'model', parts: functionCallParts });

        const functionResponseParts: GeminiPart[] = [];

        for (const part of functionCallParts) {
          const { name, args } = part.functionCall!;
          const originalName = restore(name);
          const argsJson = JSON.stringify(args ?? {});
          const toolCallId = `gemini-${callIndex++}`;

          await this.prisma.mcp_conversation_message.create({
            data: {
              conversation_id: conversationId,
              role: 'tool_call',
              content: argsJson,
              tool_name: originalName,
              tool_call_id: toolCallId,
            },
          });

          let resultContent: string;
          const entry = this.registry.get(originalName);
          if (entry) {
            const context: McpContext = {
              userId,
              sessionId: '',
              locale,
              toolName: originalName,
            };
            try {
              const result = await entry.handler(args ?? {}, context);
              resultContent = JSON.stringify(result);
            } catch (e: any) {
              resultContent = JSON.stringify({ error: e.message });
            }
          } else {
            resultContent = JSON.stringify({ error: `Tool '${originalName}' not found` });
          }

          await this.prisma.mcp_conversation_message.create({
            data: {
              conversation_id: conversationId,
              role: 'tool_result',
              content: resultContent,
              tool_name: originalName,
              tool_call_id: toolCallId,
            },
          });

          functionResponseParts.push({
            functionResponse: {
              name,
              response: { output: resultContent },
            },
          });
        }

        geminiContents.push({ role: 'user', parts: functionResponseParts });
        continue;
      }

      const finalContent = textParts.map((p) => p.text).join('');
      await this.prisma.mcp_conversation_message.create({
        data: {
          conversation_id: conversationId,
          role: 'assistant',
          content: finalContent,
        },
      });

      await this.aiExecution.finish(executionId, 'completed');

      return this.prisma.mcp_conversation_message.findMany({
        where: { conversation_id: conversationId },
        orderBy: { created_at: 'asc' },
      });
    }

    await this.aiExecution.finish(executionId, 'failed', 'Maximum tool call iterations exceeded.');
    throw new BadRequestException('Maximum tool call iterations exceeded.');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toOpenAiMessages(
    history: Array<{
      role: string;
      content: string;
      tool_name: string | null;
      tool_call_id: string | null;
    }>,
  ): OpenAiMessage[] {
    const messages: OpenAiMessage[] = [];
    const toolCallMap = new Map<string, string>(); // tool_call_id → sanitized name

    for (const msg of history) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      } else if (msg.role === 'tool_call' && msg.tool_call_id && msg.tool_name) {
        const sanitizedName = sanitize(msg.tool_name);
        toolCallMap.set(msg.tool_call_id, sanitizedName);
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: msg.tool_call_id,
              type: 'function',
              function: { name: sanitizedName, arguments: msg.content },
            },
          ],
        });
      } else if (msg.role === 'tool_result' && msg.tool_call_id) {
        messages.push({
          role: 'tool',
          tool_call_id: msg.tool_call_id,
          content: msg.content,
        });
      }
    }

    return messages;
  }

  private toGeminiContents(
    history: Array<{
      role: string;
      content: string;
      tool_name: string | null;
      tool_call_id: string | null;
    }>,
  ): GeminiContent[] {
    const contents: GeminiContent[] = [];
    let i = 0;

    while (i < history.length) {
      const msg = history[i];

      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
        i++;
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
        i++;
      } else if (msg.role === 'tool_call') {
        const functionCallParts: GeminiPart[] = [];
        while (i < history.length && history[i].role === 'tool_call') {
          const m = history[i];
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(m.content);
          } catch {
            args = {};
          }
          functionCallParts.push({
            functionCall: { name: sanitize(m.tool_name ?? ''), args },
          });
          i++;
        }
        contents.push({ role: 'model', parts: functionCallParts });
      } else if (msg.role === 'tool_result') {
        const functionResponseParts: GeminiPart[] = [];
        while (i < history.length && history[i].role === 'tool_result') {
          const m = history[i];
          functionResponseParts.push({
            functionResponse: {
              name: sanitize(m.tool_name ?? ''),
              response: { output: m.content },
            },
          });
          i++;
        }
        contents.push({ role: 'user', parts: functionResponseParts });
      } else {
        i++;
      }
    }

    return contents;
  }

  private async assertOwnership(conversationId: number, userId: number) {
    const conv = await this.prisma.mcp_conversation.findUnique({
      where: { id: conversationId },
      select: { user_id: true },
    });
    if (!conv) {
      throw new NotFoundException(`Conversation ${conversationId} not found.`);
    }
    if (conv.user_id !== userId) {
      throw new ForbiddenException('Access denied to this conversation.');
    }
  }

  private async getProviderKey(): Promise<{ provider: 'openai' | 'gemini'; apiKey: string }> {
    const settings = await this.setting.getSettingValues(['mcp-ai-profile-id']);
    const profileSlug = String(settings['mcp-ai-profile-id'] ?? '').trim();

    if (!profileSlug) {
      throw new BadRequestException(
        'No MCP AI profile configured. Select one in Settings → MCP.',
      );
    }

    const profile = await this.prisma.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });

    if (!profile) {
      throw new BadRequestException(`MCP AI profile "${profileSlug}" not found.`);
    }

    const providerSlug = profile.integration_provider.slug;
    const { apiKey } = buildAiConfigFromIntegration(providerSlug, profile.config);

    if (!apiKey) {
      throw new BadRequestException(`MCP AI profile "${profileSlug}" has no API key configured.`);
    }

    return { provider: providerSlug === 'gemini' ? 'gemini' : 'openai', apiKey };
  }

  private async buildOpenAiTools(
    message: string,
    conversationId: number,
    userId: number,
    history: ConversationHistoryItem[],
  ): Promise<ToolSelectionResult<OpenAiToolDefinition>> {
    return this.selectOpenAiTools(message, conversationId, userId, history);
  }

  private async buildGeminiTools(
    message: string,
    conversationId: number,
    userId: number,
    history: ConversationHistoryItem[],
  ): Promise<ToolSelectionResult<GeminiFunctionDeclaration>> {
    const selection = await this.selectOpenAiTools(
      message,
      conversationId,
      userId,
      history,
    );

    return {
      clarification: selection.clarification,
      tools: selection.tools.map((t) => t.function),
    };
  }

  private async selectOpenAiTools(
    message: string,
    conversationId: number,
    userId: number,
    history: ConversationHistoryItem[],
  ): Promise<ToolSelectionResult<OpenAiToolDefinition>> {
    const allEntries = this.registry.getAll();
    const allowedToolNames = await this.getAllowedMcpToolNames(userId);
    const allowedEntries = allEntries.filter((entry) =>
      allowedToolNames.has(entry.definition.name),
    );

    const dedupedBySanitized = new Map<string, ScoredTool>();
    const excludedDuplicates: string[] = [];
    const routerText = this.buildToolRouterText(message, history);
    const normalizedMessage = this.normalizeText(routerText);
    const messageTerms = this.getMessageKeywordSet(normalizedMessage);
    const domainScores = this.scoreToolDomains(normalizedMessage, allowedEntries);
    const candidateDomains = this.getCandidateDomains(domainScores);
    const clarification = this.getToolSelectionClarification(
      message,
      normalizedMessage,
      domainScores,
      candidateDomains,
      allowedEntries,
    );

    if (clarification) {
      this.logger.log(
        `MCP tools need clarification: conversationId=${conversationId} userId=${userId} ` +
          `registered=${allEntries.length} authorized=${allowedEntries.length} ` +
          `domains=${this.formatDomainScores(domainScores)} selected=0`,
      );
      return { tools: [], clarification };
    }

    const entriesForRanking =
      candidateDomains.length > 0
        ? allowedEntries.filter((entry) =>
            candidateDomains.includes(this.getToolDomain(entry.definition.name)),
          )
        : allowedEntries;

    for (const [index, entry] of entriesForRanking.entries()) {
      const originalName = entry.definition.name;
      const sanitizedName = sanitize(originalName);
      const readOnly = Boolean(entry.definition.readOnly);
      const domain = this.getToolDomain(originalName);
      const matchScore = this.scoreToolMatch(
        normalizedMessage,
        messageTerms,
        entry,
        candidateDomains,
      );

      if (dedupedBySanitized.has(sanitizedName)) {
        excludedDuplicates.push(originalName);
        continue;
      }

      const scored: ScoredTool = {
        name: originalName,
        domain,
        readOnly,
        priorityBucket: this.getDomainPriorityBucket(originalName, candidateDomains),
        keywordBoost: this.getKeywordBoost(normalizedMessage, originalName),
        matchScore,
        index,
        tool: {
          type: 'function',
          function: {
            name: sanitizedName,
            description: entry.definition.description,
            parameters: entry.definition.inputSchema ?? {
              type: 'object',
              properties: {},
            },
          },
        },
      };

      dedupedBySanitized.set(sanitizedName, scored);
    }

    const scoredTools = Array.from(dedupedBySanitized.values());
    scoredTools.sort((a, b) => {
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      if (a.priorityBucket !== b.priorityBucket) {
        return a.priorityBucket - b.priorityBucket;
      }
      if (a.keywordBoost !== b.keywordBoost) {
        return b.keywordBoost - a.keywordBoost;
      }
      if (a.readOnly !== b.readOnly) {
        return a.readOnly ? -1 : 1;
      }
      return a.index - b.index;
    });

    const selected = scoredTools.slice(0, TARGET_SELECTED_TOOLS);
    const excludedByLimit = scoredTools
      .slice(TARGET_SELECTED_TOOLS)
      .map((tool) => tool.name);

    if (excludedDuplicates.length > 0) {
      this.logger.warn(
        `MCP tools duplicate sanitize names ignored: ${excludedDuplicates.length}. ` +
          `Examples: ${excludedDuplicates.slice(0, 10).join(', ')}`,
      );
    }

    if (excludedByLimit.length > 0) {
      this.logger.warn(
        `MCP tools truncated for provider budget (${TARGET_SELECTED_TOOLS}/${MAX_OPENAI_TOOLS}). ` +
          `conversationId=${conversationId} userId=${userId} ` +
          `available=${scoredTools.length} selected=${selected.length} excluded=${excludedByLimit.length}. ` +
          `Top excluded: ${excludedByLimit.slice(0, 12).join(', ')}`,
      );
    }

    this.logger.log(
      `MCP tools prepared: conversationId=${conversationId} userId=${userId} ` +
        `registered=${allEntries.length} authorized=${allowedEntries.length} ` +
        `domains=${this.formatDomainScores(domainScores)} ranked=${scoredTools.length} ` +
        `selected=${selected.length}`,
    );

    return { tools: selected.map((entry) => entry.tool) };
  }

  private async getAllowedMcpToolNames(userId: number): Promise<Set<string>> {
    const routes = await this.prisma.route.findMany({
      where: {
        type: 'MCP' as any,
        tool_name: { not: null },
        role_route: {
          some: {
            role: {
              role_user: {
                some: { user_id: userId },
              },
            },
          },
        },
      },
      select: { tool_name: true },
    });

    return new Set(
      routes
        .map((route) => route.tool_name)
        .filter((toolName): toolName is string => typeof toolName === 'string'),
    );
  }

  private getDomainPriorityBucket(toolName: string, candidateDomains: string[]): number {
    const domain = this.getToolDomain(toolName);
    const candidateIndex = candidateDomains.indexOf(domain);
    if (candidateIndex >= 0) {
      return candidateIndex;
    }
    if (toolName.startsWith('operations.')) return 10;
    if (toolName.startsWith('finance.')) return 11;
    if (toolName.startsWith('lms.')) return 12;
    if (toolName.startsWith('core.')) return 13;
    return 99;
  }

  private getKeywordBoost(message: string, toolName: string): number {
    const terms = this.getMessageKeywordSet(message);
    if (terms.size === 0) {
      return 0;
    }

    let boost = 0;
    if (
      terms.has('task') &&
      (toolName.includes('.task') || toolName.includes('.tasks.'))
    ) {
      boost += 4;
    }
    if (
      terms.has('project') &&
      (toolName.includes('.project') || toolName.includes('.projects.'))
    ) {
      boost += 3;
    }
    if (
      terms.has('class') &&
      (toolName.includes('.class') ||
        toolName.includes('.course') ||
        toolName.includes('.training'))
    ) {
      boost += 3;
    }
    if (
      terms.has('pending') &&
      (toolName.includes('.task') ||
        toolName.includes('.approval') ||
        toolName.includes('.time-off'))
    ) {
      boost += 2;
    }

    return boost;
  }

  private buildToolRouterText(
    message: string,
    history: ConversationHistoryItem[],
  ): string {
    const recentContext = history
      .slice(-8)
      .map((item) =>
        [item.role === 'user' ? item.content : undefined, item.tool_name]
          .filter(Boolean)
          .join(' '),
      )
      .join(' ');

    return `${recentContext} ${message}`;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getToolDomain(toolName: string): string {
    return toolName.split('.')[0] || 'unknown';
  }

  private scoreToolDomains(
    normalizedMessage: string,
    entries: McpToolEntry[],
  ): Map<string, number> {
    const scores = new Map<string, number>();

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      let score = 0;
      if (this.hasTerm(normalizedMessage, domain)) {
        score += 3;
      }
      for (const keyword of keywords) {
        const normalizedKeyword = this.normalizeText(keyword);
        if (normalizedKeyword && normalizedMessage.includes(normalizedKeyword)) {
          score += normalizedKeyword.includes(' ') ? 3 : 2;
        }
      }
      if (score > 0 && entries.some((entry) => this.getToolDomain(entry.definition.name) === domain)) {
        scores.set(domain, score);
      }
    }

    for (const entry of entries) {
      const domain = this.getToolDomain(entry.definition.name);
      const toolText = this.normalizeText(
        `${entry.definition.name} ${entry.definition.description ?? ''}`,
      );
      let score = scores.get(domain) ?? 0;
      for (const term of normalizedMessage.split(' ')) {
        if (term.length >= 4 && toolText.includes(term)) {
          score += 1;
        }
      }
      if (score > 0) {
        scores.set(domain, score);
      }
    }

    return scores;
  }

  private getCandidateDomains(domainScores: Map<string, number>): string[] {
    const ranked = Array.from(domainScores.entries())
      .filter(([, score]) => score >= MIN_DOMAIN_CONFIDENCE)
      .sort((a, b) => b[1] - a[1]);

    if (ranked.length === 0) {
      return [];
    }

    const topScore = ranked[0][1];
    return ranked
      .filter(([, score]) => topScore - score <= AMBIGUOUS_DOMAIN_DELTA)
      .map(([domain]) => domain);
  }

  private getToolSelectionClarification(
    originalMessage: string,
    normalizedMessage: string,
    domainScores: Map<string, number>,
    candidateDomains: string[],
    entries: McpToolEntry[],
  ): string | undefined {
    if (!this.messageLooksLikeToolRequest(normalizedMessage)) {
      return undefined;
    }

    const rankedDomains = Array.from(domainScores.entries()).sort((a, b) => b[1] - a[1]);
    if (rankedDomains.length === 0 || rankedDomains[0][1] < MIN_DOMAIN_CONFIDENCE) {
      return this.isLikelyPortuguese(originalMessage)
        ? 'Você quer consultar qual área do sistema? Por exemplo: financeiro, operações, LMS ou configurações.'
        : 'Which system area do you want to query? For example: finance, operations, LMS, or settings.';
    }

    if (candidateDomains.length > 1) {
      const options = candidateDomains
        .slice(0, 3)
        .map((domain) => this.getDomainLabel(domain, originalMessage))
        .join(', ');
      return this.isLikelyPortuguese(originalMessage)
        ? `Você quer consultar qual área: ${options}?`
        : `Which area do you want to query: ${options}?`;
    }

    if (
      candidateDomains[0] === 'finance' &&
      this.isAmbiguousFinanceAccountsRequest(normalizedMessage, entries)
    ) {
      return this.isLikelyPortuguese(originalMessage)
        ? 'Você quer consultar contas bancárias, contas a pagar ou contas a receber?'
        : 'Do you want bank accounts, accounts payable, or accounts receivable?';
    }

    return undefined;
  }

  private scoreToolMatch(
    normalizedMessage: string,
    terms: Set<string>,
    entry: McpToolEntry,
    candidateDomains: string[],
  ): number {
    const toolName = entry.definition.name;
    const toolText = this.normalizeText(
      `${toolName} ${entry.definition.description ?? ''} ${this.getSchemaText(entry.definition.inputSchema)}`,
    );
    const domain = this.getToolDomain(toolName);
    let score = candidateDomains.includes(domain) ? 8 : 0;

    for (const term of normalizedMessage.split(' ')) {
      if (term.length < 3) continue;
      if (toolText.includes(term)) {
        score += term.length >= 5 ? 2 : 1;
      }
    }

    if (terms.has('list') && entry.definition.readOnly) score += 4;
    if (terms.has('write') && !entry.definition.readOnly) score += 4;

    score += this.getFinanceSpecificBoost(normalizedMessage, toolName);
    score += this.getKeywordBoost(normalizedMessage, toolName);

    return score;
  }

  private getSchemaText(schema: Record<string, any> | undefined): string {
    if (!schema || typeof schema !== 'object') {
      return '';
    }
    const properties = schema.properties;
    if (!properties || typeof properties !== 'object') {
      return '';
    }
    return Object.keys(properties).join(' ');
  }

  private getFinanceSpecificBoost(message: string, toolName: string): number {
    if (!toolName.startsWith('finance.')) {
      return 0;
    }

    let boost = 0;
    if (
      /banco|bancaria|bancarias|bank/.test(message) &&
      toolName.includes('bank-accounts')
    ) {
      boost += 10;
    }
    if (/extrato|statement/.test(message) && toolName.includes('statements')) {
      boost += 10;
    }
    if (/pagar|payable/.test(message) && toolName.includes('accounts-payable')) {
      boost += 10;
    }
    if (/receber|receivable/.test(message) && toolName.includes('accounts-receivable')) {
      boost += 10;
    }
    if (/moeda|currency/.test(message) && toolName.includes('currencies')) {
      boost += 8;
    }
    if (/transferencia|transfer|transferencias/.test(message) && toolName.includes('transfers')) {
      boost += 8;
    }
    return boost;
  }

  private messageLooksLikeToolRequest(normalizedMessage: string): boolean {
    return ACTION_KEYWORDS.some((keyword) =>
      this.hasTerm(normalizedMessage, this.normalizeText(keyword)),
    );
  }

  private isAmbiguousFinanceAccountsRequest(
    normalizedMessage: string,
    entries: McpToolEntry[],
  ): boolean {
    const mentionsGenericAccounts = /\b(conta|contas|account|accounts)\b/.test(normalizedMessage);
    const hasQualifier =
      /banco|bancaria|bancarias|bank|extrato|statement|pagar|payable|receber|receivable/.test(
        normalizedMessage,
      );
    if (!mentionsGenericAccounts || hasQualifier) {
      return false;
    }

    const financeToolNames = entries
      .map((entry) => entry.definition.name)
      .filter((name) => name.startsWith('finance.'));

    return (
      financeToolNames.some((name) => name.includes('bank-accounts')) &&
      (financeToolNames.some((name) => name.includes('accounts-payable')) ||
        financeToolNames.some((name) => name.includes('accounts-receivable')))
    );
  }

  private hasTerm(text: string, term: string): boolean {
    return new RegExp(`(^|\\s)${this.escapeRegex(term)}($|\\s)`).test(text);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getDomainLabel(domain: string, message: string): string {
    const labels: Record<string, { pt: string; en: string }> = {
      finance: { pt: 'financeiro', en: 'finance' },
      operations: { pt: 'operações', en: 'operations' },
      lms: { pt: 'LMS/cursos', en: 'LMS/courses' },
      core: { pt: 'configurações/core', en: 'settings/core' },
      contact: { pt: 'contatos', en: 'contacts' },
    };
    const label = labels[domain];
    if (!label) {
      return domain;
    }
    return this.isLikelyPortuguese(message) ? label.pt : label.en;
  }

  private isLikelyPortuguese(message: string): boolean {
    return /(voce|você|qual|consultar|listar|conta|contas|bancaria|bancária|extrato|tarefas|curso|cursos)/i.test(
      message,
    );
  }

  private formatDomainScores(domainScores: Map<string, number>): string {
    const formatted = Array.from(domainScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, score]) => `${domain}:${score}`)
      .join(',');

    return formatted || 'none';
  }

  private async recordAssistantAndReturnHistory(
    conversationId: number,
    content: string,
  ) {
    await this.prisma.mcp_conversation_message.create({
      data: {
        conversation_id: conversationId,
        role: 'assistant',
        content,
      },
    });

    return this.prisma.mcp_conversation_message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
  }

  private getMessageKeywordSet(message: string): Set<string> {
    const keywords = new Set<string>();
    if (/(tarefa|tarefas|task|tasks)/i.test(message)) {
      keywords.add('task');
    }
    if (/(projeto|projetos|project|projects)/i.test(message)) {
      keywords.add('project');
    }
    if (/(turma|class|curso|cursos|course|training)/i.test(message)) {
      keywords.add('class');
    }
    if (/(pendente|pendentes|pending|open|aberta|abertas)/i.test(message)) {
      keywords.add('pending');
    }
    if (/(listar|lista|buscar|procurar|consultar|mostrar|ver|list|search|find|show|get)/i.test(message)) {
      keywords.add('list');
    }
    if (/(criar|adicionar|atualizar|alterar|remover|deletar|excluir|create|add|update|delete|remove)/i.test(message)) {
      keywords.add('write');
    }
    return keywords;
  }
}
