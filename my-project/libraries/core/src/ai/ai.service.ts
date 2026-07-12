import { PaginationDTO } from '@hed-hog/api-pagination';
import { Prisma, PrismaService } from '@hed-hog/api-prisma';
import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import axios from 'axios';
import { createHash } from 'crypto';
import pdfParse from 'pdf-parse';
import { AiExecutionService } from '../ai-instruction/ai-execution.service';
import { DeleteDTO } from '../dto/delete.dto';
import { FileService } from '../file/file.service';
import { buildAiConfigFromIntegration } from '../integration-profile/integration-profile.utils';
import { SettingService } from '../setting/setting.service';
import { ChatAgentDTO } from './dto/chat-agent.dto';
import { ChatDTO } from './dto/chat.dto';
import { CreateAgentDTO } from './dto/create-agent.dto';
import { UpdateAgentDTO } from './dto/update-agent.dto';

type AiProvider = 'openai' | 'gemini';

type AiAgentRecord = {
  id: number;
  slug: string;
  provider: AiProvider;
  model: string | null;
  instructions: string | null;
  external_agent_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type AiAttachment = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
    @Inject(forwardRef(() => FileService))
    private readonly fileService: FileService,
    @Inject(forwardRef(() => AiExecutionService))
    private readonly aiExecution: AiExecutionService,
  ) {}

  async onModuleInit() {
    try {
      const s = await this.settingService.getSettingValues([
        'ai-openai-profile-id',
        'ai-gemini-profile-id',
      ]);
      if (
        !String(s['ai-openai-profile-id'] ?? '').trim() &&
        !String(s['ai-gemini-profile-id'] ?? '').trim()
      ) {
        this.logger.warn('No AI profiles configured. Set profiles in Settings → AI.');
      }
    } catch { /* settings not available yet */ }
  }

  async chat(data: ChatDTO, file?: MulterFile) {
    const provider = data.provider || 'openai';
    const attachment = await this.resolveAttachment(file, data.file_id);

    const executionId = await this.aiExecution.start({ trigger: 'api', contextSlug: 'ai-chat' });
    const stepStart = Date.now();

    try {
      if (provider === 'openai') {
        const model = data.model || 'gpt-4o-mini';
        const { content, usage } = await this.chatWithOpenAi({
          message: data.message,
          model,
          systemPrompt: data.systemPrompt,
          attachment,
        });

        await this.aiExecution.recordStep({
          executionId,
          stepOrder: 0,
          type: 'output',
          provider: 'openai',
          model,
          durationMs: Date.now() - stepStart,
          usage,
          outputSummary: content.slice(0, 200),
        });
        await this.aiExecution.finish(executionId, 'completed');

        return { provider, model, content };
      }

      const model = data.model || 'gemini-1.5-flash';
      const { content, usage } = await this.chatWithGemini({
        message: data.message,
        model,
        systemPrompt: data.systemPrompt,
        attachment,
      });

      await this.aiExecution.recordStep({
        executionId,
        stepOrder: 0,
        type: 'output',
        provider: 'gemini',
        model,
        durationMs: Date.now() - stepStart,
        usage,
        outputSummary: content.slice(0, 200),
      });
      await this.aiExecution.finish(executionId, 'completed');

      return { provider, model, content };
    } catch (err) {
      await this.aiExecution.finish(executionId, 'failed', String(err));
      throw err;
    }
  }

  async createAgent(data: CreateAgentDTO) {
    const slug = data.slug.trim();
    const provider = data.provider || 'openai';
    const model = data.model || this.getDefaultModel(provider);
    const instructions = data.instructions?.trim() || null;

    const existing = await this.findAgentBySlug(slug);
    if (existing) {
      return existing;
    }

    let externalAgentId: string | null = null;

    if (provider === 'openai') {
      externalAgentId = await this.createOpenAiAssistant({
        slug,
        model,
        instructions,
      });
    }

    await this.prismaService.$executeRaw`
      INSERT INTO ai_agent (slug, provider, model, instructions, external_agent_id)
      VALUES (
        ${slug},
        CAST(${provider} AS ai_agent_provider_enum),
        ${model},
        ${instructions},
        ${externalAgentId}
      )
    `;

    return this.findAgentBySlug(slug);
  }

  async listAgents(paginationParams: PaginationDTO) {
    const page = Math.max(Number(paginationParams?.page || 1), 1);
    const pageSize = Math.min(
      Math.max(Number(paginationParams?.pageSize || 10), 1),
      100,
    );
    const offset = (page - 1) * pageSize;
    const search = String(paginationParams?.search || '').trim();

    const whereClause = search
      ? Prisma.sql`WHERE LOWER(slug) LIKE LOWER(${`%${search}%`})`
      : Prisma.empty;

    const data = await this.prismaService.$queryRaw<AiAgentRecord[]>(Prisma.sql`
      SELECT id, slug, provider, model, instructions, external_agent_id, created_at, updated_at
      FROM ai_agent
      ${whereClause}
      ORDER BY id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    const totalResult = await this.prismaService.$queryRaw<Array<{ total: bigint | number | string }>>(Prisma.sql`
      SELECT COUNT(*) AS total
      FROM ai_agent
      ${whereClause}
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

  async getAgentById(agentId: number) {
    const agent = await this.findAgentById(agentId);

    if (!agent) {
      throw new NotFoundException(`AI agent with id "${agentId}" was not found.`);
    }

    return agent;
  }

  async updateAgent(agentId: number, data: UpdateAgentDTO) {
    const currentAgent = await this.findAgentById(agentId);

    if (!currentAgent) {
      throw new NotFoundException(`AI agent with id "${agentId}" was not found.`);
    }

    const slug = data.slug?.trim() ?? currentAgent.slug;
    const provider = data.provider ?? currentAgent.provider;
    const model = data.model ?? currentAgent.model ?? this.getDefaultModel(provider);
    const instructions = data.instructions ?? currentAgent.instructions;

    if (slug !== currentAgent.slug) {
      const existingSlug = await this.findAgentBySlug(slug);
      if (existingSlug && existingSlug.id !== agentId) {
        throw new BadRequestException(`AI agent with slug "${slug}" already exists.`);
      }
    }

    let externalAgentId = currentAgent.external_agent_id;

    if (provider !== 'openai') {
      externalAgentId = null;
    } else if (!externalAgentId) {
      externalAgentId = await this.createOpenAiAssistant({
        slug,
        model,
        instructions,
      });
    }

    await this.prismaService.$executeRaw`
      UPDATE ai_agent
      SET slug = ${slug},
          provider = CAST(${provider} AS ai_agent_provider_enum),
          model = ${model},
          instructions = ${instructions},
          external_agent_id = ${externalAgentId},
          updated_at = NOW()
      WHERE id = ${agentId}
    `;

    return this.getAgentById(agentId);
  }

  async deleteAgents({ ids }: DeleteDTO) {
    const existing = await this.prismaService.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id
      FROM ai_agent
      WHERE id IN (${Prisma.join(ids)})
    `);

    if (existing.length !== ids.length) {
      const existingIds = existing.map((item) => item.id);
      const missingIds = ids.filter((id) => !existingIds.includes(id));
      throw new NotFoundException(
        `AI agents with ids "${missingIds.join(', ')}" were not found.`,
      );
    }

    const deletedCount = await this.prismaService.$executeRaw`
      DELETE FROM ai_agent
      WHERE id IN (${Prisma.join(ids)})
    `;

    return {
      count: Number(deletedCount || 0),
    };
  }

  async chatWithAgent(slug: string, data: ChatAgentDTO, file?: MulterFile) {
    const agent = await this.findAgentBySlug(slug);
    const attachment = await this.resolveAttachment(file, data.file_id);

    if (!agent) {
      throw new NotFoundException(`AI agent with slug "${slug}" was not found.`);
    }

    if (agent.provider === 'openai') {
      if (agent.external_agent_id && !attachment) {
        const content = await this.chatWithOpenAiAssistant(
          agent.external_agent_id,
          data.message,
        );

        return {
          slug: agent.slug,
          provider: agent.provider,
          model: agent.model,
          content,
        };
      }

      const { content } = await this.chatWithOpenAi({
        message: data.message,
        model: agent.model || this.getDefaultModel('openai'),
        systemPrompt: agent.instructions || undefined,
        attachment,
      });

      return {
        slug: agent.slug,
        provider: agent.provider,
        model: agent.model,
        content,
      };
    }

    const { content } = await this.chatWithGemini({
      message: data.message,
      model: agent.model || this.getDefaultModel('gemini'),
      systemPrompt: agent.instructions || undefined,
      attachment,
    });

    return {
      slug: agent.slug,
      provider: agent.provider,
      model: agent.model,
      content,
    };
  }

  async getAgentBySlug(slug: string) {
    const agent = await this.findAgentBySlug(slug);

    if (!agent) {
      throw new NotFoundException(`AI agent with slug "${slug}" was not found.`);
    }

    return agent;
  }

  async extractAttachmentText(file?: MulterFile, fileId?: number): Promise<string> {
    const attachment = await this.resolveAttachment(file, fileId);

    if (!attachment) {
      return '';
    }

    if (this.isPdfMime(attachment.mimeType)) {
      return this.extractPdfText(attachment.buffer);
    }

    if (this.isTextMime(attachment.mimeType)) {
      return this.toUtf8Text(attachment.buffer);
    }

    return '';
  }

  async debugAttachmentForLlm(file?: MulterFile, fileId?: number) {
    const attachment = await this.resolveAttachment(file, fileId);

    if (!attachment) {
      return {
        hasAttachment: false,
        filename: '',
        mimeType: '',
        bytes: 0,
        mode: 'binary' as const,
        textLength: 0,
        textSample: '',
        sha256: '',
      };
    }

    let mode: 'image' | 'pdf-text' | 'text' | 'binary' = 'binary';
    let extractedText = '';

    if (this.isImageMime(attachment.mimeType)) {
      mode = 'image';
    } else if (this.isPdfMime(attachment.mimeType)) {
      mode = 'pdf-text';
      extractedText = await this.extractPdfText(attachment.buffer);
    } else if (this.isTextMime(attachment.mimeType)) {
      mode = 'text';
      extractedText = this.toUtf8Text(attachment.buffer);
    }

    const result = {
      hasAttachment: true,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      bytes: attachment.buffer.length,
      mode,
      textLength: extractedText.length,
      textSample: extractedText.slice(0, 600),
      sha256: createHash('sha256').update(attachment.buffer).digest('hex'),
    };

    this.logger.warn(
      `[AI-ATTACHMENT-DEBUG] fileId=${fileId || 'upload'} filename="${result.filename}" mime=${result.mimeType} mode=${result.mode} bytes=${result.bytes} textLength=${result.textLength}`,
    );

    return result;
  }

  private async findAgentBySlug(slug: string): Promise<AiAgentRecord | null> {
    const result = await this.prismaService.$queryRaw<AiAgentRecord[]>`
      SELECT id, slug, provider, model, instructions, external_agent_id, created_at, updated_at
      FROM ai_agent
      WHERE slug = ${slug}
      LIMIT 1
    `;

    return result?.[0] || null;
  }

  private async findAgentById(id: number): Promise<AiAgentRecord | null> {
    const result = await this.prismaService.$queryRaw<AiAgentRecord[]>`
      SELECT id, slug, provider, model, instructions, external_agent_id, created_at, updated_at
      FROM ai_agent
      WHERE id = ${id}
      LIMIT 1
    `;

    return result?.[0] || null;
  }

  private getDefaultModel(provider: AiProvider): string {
    if (provider === 'openai') {
      return 'gpt-4o-mini';
    }

    return 'gemini-1.5-flash';
  }

  private async getAiApiKey(provider: AiProvider): Promise<string> {
    const slug = provider === 'openai' ? 'ai-openai-profile-id' : 'ai-gemini-profile-id';
    const settings = await this.settingService.getSettingValues([slug]);
    const profileSlug = String(settings[slug] ?? '').trim();

    if (!profileSlug) {
      throw new BadRequestException(
        `No ${provider} AI profile configured. Set one in Settings → AI.`,
      );
    }

    const profile = await this.prismaService.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });

    if (!profile) {
      throw new BadRequestException(`AI profile "${profileSlug}" not found.`);
    }

    const { apiKey } = buildAiConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );

    if (!apiKey) {
      throw new BadRequestException(`AI profile "${profileSlug}" has no API key configured.`);
    }

    return apiKey;
  }

  private async chatWithOpenAi({
    message,
    model,
    systemPrompt,
    attachment,
  }: {
    message: string;
    model: string;
    systemPrompt?: string;
    attachment?: AiAttachment | null;
  }): Promise<{ content: string; usage?: { input: number; output: number; total: number } }> {
    const openai = await this.getAiApiKey('openai');

    const messages: Array<any> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    const userContent = await this.buildOpenAiUserContent(message, attachment);
    messages.push({ role: 'user', content: userContent });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model, messages },
      {
        headers: {
          Authorization: `Bearer ${openai}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const u = response.data?.usage;
    return {
      content: response.data?.choices?.[0]?.message?.content || '',
      usage: u ? { input: u.prompt_tokens ?? 0, output: u.completion_tokens ?? 0, total: u.total_tokens ?? 0 } : undefined,
    };
  }

  private async createOpenAiAssistant({
    slug,
    model,
    instructions,
  }: {
    slug: string;
    model: string;
    instructions: string | null;
  }): Promise<string> {
    const openai = await this.getAiApiKey('openai');

    const response = await axios.post(
      'https://api.openai.com/v1/assistants',
      {
        name: slug,
        model,
        instructions: instructions || `You are the assistant identified by slug ${slug}.`,
      },
      {
        headers: {
          Authorization: `Bearer ${openai}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
      },
    );

    const assistantId = response.data?.id;

    if (!assistantId) {
      throw new BadRequestException('OpenAI assistant creation failed.');
    }

    return assistantId;
  }

  private async chatWithOpenAiAssistant(
    assistantId: string,
    message: string,
  ): Promise<string> {
    const openai = await this.getAiApiKey('openai');

    const threadResponse = await axios.post(
      'https://api.openai.com/v1/threads',
      {
        messages: [{ role: 'user', content: message }],
      },
      {
        headers: {
          Authorization: `Bearer ${openai}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
      },
    );

    const threadId = threadResponse.data?.id;

    if (!threadId) {
      throw new BadRequestException('OpenAI thread creation failed.');
    }

    const runResponse = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        assistant_id: assistantId,
      },
      {
        headers: {
          Authorization: `Bearer ${openai}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
      },
    );

    const runId = runResponse.data?.id;

    if (!runId) {
      throw new BadRequestException('OpenAI assistant run failed to start.');
    }

    for (let i = 0; i < 30; i++) {
      const runStatusResponse = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${openai}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );

      const status = runStatusResponse.data?.status;

      if (status === 'completed') {
        break;
      }

      if (['cancelled', 'failed', 'expired'].includes(status)) {
        throw new BadRequestException(
          `OpenAI assistant run did not complete successfully (status: ${status}).`,
        );
      }

      await this.sleep(1000);
    }

    const messagesResponse = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${openai}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      },
    );

    const assistantMessage = messagesResponse.data?.data?.find(
      (item: any) => item.role === 'assistant',
    );

    const output = assistantMessage?.content?.[0]?.text?.value;

    return output || '';
  }

  private async chatWithGemini({
    message,
    model,
    systemPrompt,
    attachment,
  }: {
    message: string;
    model: string;
    systemPrompt?: string;
    attachment?: AiAttachment | null;
  }): Promise<{ content: string; usage?: { input: number; output: number; total: number } }> {
    const gemini = await this.getAiApiKey('gemini');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemini}`;

    const userParts: any[] = [{ text: message }];

    if (attachment) {
      if (this.isTextMime(attachment.mimeType)) {
        userParts.push({
          text: `\n\n[Attached file: ${attachment.filename}]\n${this.toUtf8Text(attachment.buffer)}`,
        });
      } else if (this.isPdfMime(attachment.mimeType)) {
        const pdfText = await this.extractPdfText(attachment.buffer);
        if (pdfText) {
          userParts.push({
            text: `\n\n[Attached file: ${attachment.filename}]\n${pdfText}`,
          });
        } else {
          userParts.push({
            inline_data: {
              mime_type: attachment.mimeType,
              data: attachment.buffer.toString('base64'),
            },
          });
        }
      } else {
        userParts.push({
          inline_data: {
            mime_type: attachment.mimeType,
            data: attachment.buffer.toString('base64'),
          },
        });
      }
    }

    const payload: any = {
      contents: [{ parts: userParts }],
    };

    if (systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const parts = response.data?.candidates?.[0]?.content?.parts || [];
    const content = parts.map((part: any) => part.text || '').join('');
    const u = response.data?.usageMetadata;
    return {
      content,
      usage: u ? { input: u.promptTokenCount ?? 0, output: u.candidatesTokenCount ?? 0, total: u.totalTokenCount ?? 0 } : undefined,
    };
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async resolveAttachment(
    uploadFile?: MulterFile,
    fileId?: number,
  ): Promise<AiAttachment | null> {
    if (uploadFile) {
      const mimeType = this.normalizeAttachmentMimeType(
        uploadFile.mimetype,
        uploadFile.originalname,
      );
      return {
        filename: uploadFile.originalname,
        mimeType,
        buffer: uploadFile.buffer,
      };
    }

    if (fileId) {
      const { file, buffer } = await this.fileService.getBuffer(fileId);
      const mimeType = this.normalizeAttachmentMimeType(
        file.file_mimetype?.name || 'application/octet-stream',
        file.filename,
      );
      return {
        filename: file.filename,
        mimeType,
        buffer,
      };
    }

    return null;
  }

  private async buildOpenAiUserContent(
    message: string,
    attachment?: AiAttachment | null,
  ) {
    if (!attachment) {
      return message;
    }

    if (this.isImageMime(attachment.mimeType)) {
      const dataUri = `data:${attachment.mimeType};base64,${attachment.buffer.toString('base64')}`;
      return [
        { type: 'text', text: message },
        { type: 'image_url', image_url: { url: dataUri } },
      ];
    }

    let text: string;

    if (this.isTextMime(attachment.mimeType)) {
      text = this.toUtf8Text(attachment.buffer);
    } else if (this.isPdfMime(attachment.mimeType)) {
      text =
        (await this.extractPdfText(attachment.buffer)) ||
        `[PDF attachment with unreadable text: ${attachment.filename}]`;
    } else {
      text = `[Binary attachment: ${attachment.filename} | ${attachment.mimeType} | ${attachment.buffer.length} bytes]`;
    }

    return `${message}\n\n[Attached file: ${attachment.filename}]\n${text}`;
  }

  private isImageMime(mimeType: string) {
    return mimeType.startsWith('image/');
  }

  private isTextMime(mimeType: string) {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml'
    );
  }

  private isPdfMime(mimeType: string) {
    return (
      mimeType === 'application/pdf' ||
      mimeType === 'application/x-pdf' ||
      mimeType.endsWith('/pdf')
    );
  }

  private normalizeAttachmentMimeType(mimeType: string, filename?: string) {
    const current = (mimeType || '').toLowerCase();
    if (current && current !== 'application/octet-stream') {
      return current;
    }

    const name = (filename || '').toLowerCase();

    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.json')) return 'application/json';
    if (name.endsWith('.xml')) return 'application/xml';
    if (name.endsWith('.txt') || name.endsWith('.csv')) return 'text/plain';
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    if (name.endsWith('.webp')) return 'image/webp';

    return current || 'application/octet-stream';
  }

  private async extractPdfText(buffer: Buffer) {
    try {
      const result = await pdfParse(buffer);
      const text = (result?.text || '')
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (!text) {
        return '';
      }

      return text.slice(0, 60000);
    } catch {
      return '';
    }
  }

  private toUtf8Text(buffer: Buffer) {
    return buffer.toString('utf8');
  }
}
