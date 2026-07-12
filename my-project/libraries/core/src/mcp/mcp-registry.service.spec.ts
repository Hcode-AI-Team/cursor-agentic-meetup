import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { McpRegistryService } from './mcp-registry.service';
import { MCP_TOOL_METADATA } from './decorators/mcp-tool.decorator';

class ToolProvider {
  myTool() {
    return 'result';
  }
  notATool() {
    return 'nope';
  }
}

class DuplicateProvider {
  alsoMyTool() {
    return 'dup';
  }
}

const makeReflector = (defs: Array<[Function, any]>) => {
  const map = new Map(defs);
  return {
    get: jest.fn((_key: any, target: any) => map.get(target)),
  };
};

describe('McpRegistryService', () => {
  afterEach(() => jest.clearAllMocks());

  it('registra tools decoradas e ignora métodos sem metadata', () => {
    const instance = new ToolProvider();
    const reflector = makeReflector([
      [ToolProvider.prototype.myTool, { name: 'my_tool', description: 'd' }],
    ]);
    const discovery = { getProviders: () => [{ instance }] };
    const service = new McpRegistryService(discovery as any, reflector as any);

    service.onModuleInit();

    expect(service.has('my_tool')).toBe(true);
    expect(service.getAll()).toHaveLength(1);
    expect(reflector.get).toHaveBeenCalledWith(
      MCP_TOOL_METADATA,
      ToolProvider.prototype.myTool,
    );
  });

  it('deduplica tools com mesmo nome (mantém a primeira)', () => {
    const first = new ToolProvider();
    const dup = new DuplicateProvider();
    const reflector = makeReflector([
      [ToolProvider.prototype.myTool, { name: 'my_tool', description: 'first' }],
      [DuplicateProvider.prototype.alsoMyTool, { name: 'my_tool', description: 'dup' }],
    ]);
    const discovery = { getProviders: () => [{ instance: first }, { instance: dup }] };
    const service = new McpRegistryService(discovery as any, reflector as any);

    service.onModuleInit();

    expect(service.getAll()).toHaveLength(1);
    expect(service.get('my_tool')?.definition.description).toBe('first');
  });

  it('ignora providers sem instância', () => {
    const reflector = makeReflector([]);
    const discovery = {
      getProviders: () => [{ instance: null }, { instance: undefined }],
    };
    const service = new McpRegistryService(discovery as any, reflector as any);
    service.onModuleInit();
    expect(service.getAll()).toHaveLength(0);
  });

  it('handler executa o método vinculado à instância', async () => {
    const instance = new ToolProvider();
    const reflector = makeReflector([
      [ToolProvider.prototype.myTool, { name: 'my_tool', description: 'd' }],
    ]);
    const discovery = { getProviders: () => [{ instance }] };
    const service = new McpRegistryService(discovery as any, reflector as any);
    service.onModuleInit();

    const entry = service.get('my_tool');
    expect(entry!.handler({}, {} as any)).toBe('result');
  });

  it('get retorna undefined para tool inexistente', () => {
    const service = new McpRegistryService(
      { getProviders: () => [] } as any,
      makeReflector([]) as any,
    );
    service.onModuleInit();
    expect(service.get('missing')).toBeUndefined();
    expect(service.has('missing')).toBe(false);
  });
});
