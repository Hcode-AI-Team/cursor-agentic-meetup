import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const setRequestHandlerMock = jest.fn();
const connectMock = jest.fn<any>().mockResolvedValue(undefined);
const handleRequestMock = jest.fn<any>().mockResolvedValue(undefined);

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(function (this: any) {
    this.setRequestHandler = setRequestHandlerMock;
    this.connect = connectMock;
  }),
}));

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: jest.fn().mockImplementation(function (this: any) {
    this.handleRequest = handleRequestMock;
  }),
}));

import { McpServerService } from './mcp-server.service';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { McpContext } from './types/mcp-context.type';

const makeDeps = () => {
  const registry = {
    getAll: jest.fn(),
    get: jest.fn(),
  };
  const audit = {
    record: jest.fn<any>().mockResolvedValue(undefined),
  };
  return { registry, audit };
};

const makeService = (deps = makeDeps()) => ({
  service: new McpServerService(deps.registry as any, deps.audit as any),
  deps,
});

const getRegisteredHandler = (schema: any) => {
  const call = setRequestHandlerMock.mock.calls.find((c: any) => c[0] === schema);
  return call?.[1];
};

const context: McpContext = {
  userId: 1,
  sessionId: 'sess-1',
  locale: 'pt-BR',
  toolName: '',
};

describe('McpServerService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('buildServer / ListTools handler', () => {
    it('lista as ferramentas registradas mapeando definition para o schema MCP', async () => {
      const { service, deps } = makeService();
      deps.registry.getAll.mockReturnValue([
        {
          definition: { name: 'tool-a', description: 'desc a', inputSchema: { type: 'object', properties: { x: {} } } },
          handler: jest.fn(),
        },
        {
          definition: { name: 'tool-b', description: 'desc b' },
          handler: jest.fn(),
        },
      ]);

      (service as any).buildServer(context);
      const listHandler = getRegisteredHandler(ListToolsRequestSchema);
      const result = await listHandler();

      expect(result.tools).toEqual([
        { name: 'tool-a', description: 'desc a', inputSchema: { type: 'object', properties: { x: {} } } },
        { name: 'tool-b', description: 'desc b', inputSchema: { type: 'object', properties: {} } },
      ]);
    });
  });

  describe('buildServer / CallTool handler', () => {
    it('retorna erro quando a ferramenta não é encontrada e não audita', async () => {
      const { service, deps } = makeService();
      deps.registry.getAll.mockReturnValue([]);
      deps.registry.get.mockReturnValue(undefined);

      (service as any).buildServer(context);
      const callHandler = getRegisteredHandler(CallToolRequestSchema);

      const result = await callHandler({
        params: { name: 'missing-tool', arguments: {} },
      });

      expect(result).toEqual({
        isError: true,
        content: [{ type: 'text', text: `Tool 'missing-tool' not found` }],
      });
      expect(deps.audit.record).not.toHaveBeenCalled();
    });

    it('executa a ferramenta com sucesso, audita success:true e retorna o resultado serializado', async () => {
      const { service, deps } = makeService();
      const handler = jest.fn<any>().mockResolvedValue({ ok: true, value: 42 });
      deps.registry.getAll.mockReturnValue([]);
      deps.registry.get.mockReturnValue({
        definition: { name: 'tool-a' },
        handler,
      });

      (service as any).buildServer(context);
      const callHandler = getRegisteredHandler(CallToolRequestSchema);

      const result = await callHandler({
        params: { name: 'tool-a', arguments: { a: 1 } },
      });

      expect(handler).toHaveBeenCalledWith({ a: 1 }, { ...context, toolName: 'tool-a' });
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify({ ok: true, value: 42 }) }],
      });
      expect(deps.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: context.userId,
          toolName: 'tool-a',
          input: { a: 1 },
          success: true,
        }),
      );
    });

    it('trata argumentos ausentes como objeto vazio', async () => {
      const { service, deps } = makeService();
      const handler = jest.fn<any>().mockResolvedValue({});
      deps.registry.getAll.mockReturnValue([]);
      deps.registry.get.mockReturnValue({ definition: { name: 'tool-a' }, handler });

      (service as any).buildServer(context);
      const callHandler = getRegisteredHandler(CallToolRequestSchema);

      await callHandler({ params: { name: 'tool-a' } });

      expect(handler).toHaveBeenCalledWith({}, expect.anything());
    });

    it('captura exceção do handler, audita success:false com o erro e retorna isError', async () => {
      const { service, deps } = makeService();
      const handler = jest.fn<any>().mockRejectedValue(new Error('boom'));
      deps.registry.getAll.mockReturnValue([]);
      deps.registry.get.mockReturnValue({ definition: { name: 'tool-a' }, handler });

      (service as any).buildServer(context);
      const callHandler = getRegisteredHandler(CallToolRequestSchema);

      const result = await callHandler({
        params: { name: 'tool-a', arguments: {} },
      });

      expect(result).toEqual({
        isError: true,
        content: [{ type: 'text', text: 'boom' }],
      });
      expect(deps.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'tool-a',
          success: false,
          error: 'boom',
        }),
      );
    });
  });

  describe('handleRequest', () => {
    it('conecta o servidor e delega ao transport HTTP', async () => {
      const { service, deps } = makeService();
      deps.registry.getAll.mockReturnValue([]);
      const req = { body: { hello: 'world' } } as any;
      const res = {} as any;

      await service.handleRequest(req, res, context);

      expect(connectMock).toHaveBeenCalledTimes(1);
      expect(handleRequestMock).toHaveBeenCalledWith(req, res, req.body);
    });
  });
});
