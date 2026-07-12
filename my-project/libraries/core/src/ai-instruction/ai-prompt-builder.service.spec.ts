import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AiPromptBuilderService } from './ai-prompt-builder.service';

const makeService = () => {
  const instructionService = {
    getLayer: jest.fn(),
    getAgentInstruction: jest.fn(),
  };
  const service = new AiPromptBuilderService(instructionService as any);
  return { service, instructionService };
};

describe('AiPromptBuilderService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('build', () => {
    it('inclui apenas a camada system quando é a única disponível', async () => {
      const { service, instructionService } = makeService();
      instructionService.getLayer.mockImplementation(async (layer: string) =>
        layer === 'system' ? 'SYS' : null,
      );

      const result = await service.build({});

      expect(result.layers).toEqual(['SYS']);
      expect(result.layerNames).toEqual(['system']);
      expect(result.systemPrompt).toBe('SYS');
    });

    it('junta system + product com o separador', async () => {
      const { service, instructionService } = makeService();
      instructionService.getLayer.mockImplementation(async (layer: string) => {
        if (layer === 'system') return 'SYS';
        if (layer === 'product') return 'PROD';
        return null;
      });

      const result = await service.build({});

      expect(result.layers).toEqual(['SYS', 'PROD']);
      expect(result.layerNames).toEqual(['system', 'product']);
      expect(result.systemPrompt).toBe('SYS\n\n---\n\nPROD');
    });

    it('inclui a camada module quando moduleSlug é fornecido e existe', async () => {
      const { service, instructionService } = makeService();
      instructionService.getLayer.mockImplementation(
        async (layer: string, slug?: string) => {
          if (layer === 'system') return 'SYS';
          if (layer === 'module' && slug === 'crm') return 'MOD';
          return null;
        },
      );

      const result = await service.build({ moduleSlug: 'crm' });

      expect(result.layerNames).toEqual(['system', 'module:crm']);
      expect(instructionService.getLayer).toHaveBeenCalledWith('module', 'crm');
    });

    it('não inclui module quando moduleSlug é fornecido mas não há conteúdo', async () => {
      const { service, instructionService } = makeService();
      instructionService.getLayer.mockImplementation(async (layer: string) =>
        layer === 'system' ? 'SYS' : null,
      );

      const result = await service.build({ moduleSlug: 'crm' });

      expect(result.layerNames).toEqual(['system']);
    });

    it('inclui a camada agent quando agentSlug é fornecido e existe', async () => {
      const { service, instructionService } = makeService();
      instructionService.getLayer.mockImplementation(async (layer: string) =>
        layer === 'system' ? 'SYS' : null,
      );
      instructionService.getAgentInstruction.mockResolvedValue('AGENT');

      const result = await service.build({ agentSlug: 'support' });

      expect(result.layerNames).toEqual(['system', 'agent:support']);
      expect(result.layers).toEqual(['SYS', 'AGENT']);
      expect(instructionService.getAgentInstruction).toHaveBeenCalledWith('support');
    });

    it('compõe as quatro camadas na ordem de prioridade', async () => {
      const { service, instructionService } = makeService();
      instructionService.getLayer.mockImplementation(
        async (layer: string, slug?: string) => {
          if (layer === 'system') return 'L1';
          if (layer === 'product') return 'L2';
          if (layer === 'module' && slug === 'm') return 'L3';
          return null;
        },
      );
      instructionService.getAgentInstruction.mockResolvedValue('L4');

      const result = await service.build({ moduleSlug: 'm', agentSlug: 'a' });

      expect(result.layers).toEqual(['L1', 'L2', 'L3', 'L4']);
      expect(result.systemPrompt).toBe('L1\n\n---\n\nL2\n\n---\n\nL3\n\n---\n\nL4');
    });

    it('retorna prompt vazio quando nenhuma camada tem conteúdo', async () => {
      const { service, instructionService } = makeService();
      instructionService.getLayer.mockResolvedValue(null);

      const result = await service.build({});

      expect(result.layers).toEqual([]);
      expect(result.layerNames).toEqual([]);
      expect(result.systemPrompt).toBe('');
    });
  });

  describe('buildRuntimeContext', () => {
    it('inclui apenas o cabeçalho quando não há parâmetros', () => {
      const { service } = makeService();
      expect(service.buildRuntimeContext({})).toBe('[Runtime context]');
    });

    it('inclui campos presentes na ordem esperada', () => {
      const { service } = makeService();
      const out = service.buildRuntimeContext({
        userId: 7,
        locale: 'pt',
        userRoles: ['admin', 'user'],
        currentDate: '2026-07-04',
      });
      expect(out).toBe(
        [
          '[Runtime context]',
          'user_id: 7',
          'locale: pt',
          'roles: admin, user',
          'date: 2026-07-04',
        ].join('\n'),
      );
    });

    it('ignora userRoles vazio', () => {
      const { service } = makeService();
      const out = service.buildRuntimeContext({ userId: 1, userRoles: [] });
      expect(out).toBe('[Runtime context]\nuser_id: 1');
    });

    it('anexa extraContext como pares chave: valor', () => {
      const { service } = makeService();
      const out = service.buildRuntimeContext({
        userId: 1,
        extraContext: { plan: 'pro', tz: 'UTC' },
      });
      expect(out).toContain('plan: pro');
      expect(out).toContain('tz: UTC');
    });
  });

  describe('summarizeHistory', () => {
    it('retorna as mensagens intactas quando o total <= keepLast', () => {
      const { service } = makeService();
      const messages = [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
      ];
      expect(service.summarizeHistory(messages, 6)).toBe(messages);
    });

    it('resume as mensagens antigas e mantém as recentes verbatim', () => {
      const { service } = makeService();
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `msg-${i}`,
      }));

      const result = service.summarizeHistory(messages, 6);

      // 1 mensagem de resumo + 6 recentes
      expect(result).toHaveLength(7);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toContain('[Earlier conversation summary: 4 messages]');
      expect(result[0].content).toContain('First question: "msg-0"');
      // As 6 últimas verbatim.
      expect(result.slice(1)).toEqual(messages.slice(4));
    });

    it('inclui a contagem de tool_call quando há chamadas de ferramenta', () => {
      const { service } = makeService();
      const messages = [
        { role: 'user', content: 'q' },
        { role: 'tool_call', content: 't1' },
        { role: 'tool_call', content: 't2' },
        { role: 'assistant', content: 'r' },
        { role: 'user', content: 'q2' },
        { role: 'assistant', content: 'r2' },
        { role: 'user', content: 'q3' },
        { role: 'assistant', content: 'r3' },
      ];

      const result = service.summarizeHistory(messages, 2);

      expect(result[0].content).toContain('Tools called: 2');
    });

    it('trunca a primeira pergunta em 120 caracteres', () => {
      const { service } = makeService();
      const longQuestion = 'x'.repeat(200);
      const messages = [
        { role: 'user', content: longQuestion },
        ...Array.from({ length: 6 }, (_, i) => ({
          role: 'assistant',
          content: `r-${i}`,
        })),
      ];

      const result = service.summarizeHistory(messages, 1);

      expect(result[0].content).toContain(`"${'x'.repeat(120)}"`);
      expect(result[0].content).not.toContain('x'.repeat(121));
    });
  });

  describe('interpolate', () => {
    it('substitui os placeholders {{var}} pelos valores', () => {
      const { service } = makeService();
      expect(
        service.interpolate('Olá {{name}}, seu plano é {{plan}}', {
          name: 'Ana',
          plan: 'pro',
        }),
      ).toBe('Olá Ana, seu plano é pro');
    });

    it('mantém o placeholder quando a variável não existe', () => {
      const { service } = makeService();
      expect(service.interpolate('valor {{missing}}', {})).toBe('valor {{missing}}');
    });

    it('substitui múltiplas ocorrências da mesma variável', () => {
      const { service } = makeService();
      expect(service.interpolate('{{x}}-{{x}}', { x: 'a' })).toBe('a-a');
    });

    it('não altera texto sem placeholders', () => {
      const { service } = makeService();
      expect(service.interpolate('sem variaveis', { a: '1' })).toBe('sem variaveis');
    });
  });
});
