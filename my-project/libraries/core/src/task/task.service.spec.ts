import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TasksService } from './task.service';

const makeDeps = () => {
  const prismaService = { $executeRaw: jest.fn().mockResolvedValue(0) };
  const settingService = { getSettingValues: jest.fn().mockResolvedValue({}) };
  return { prismaService, settingService };
};

const makeService = (deps = makeDeps()) => ({
  service: new TasksService(deps.prismaService as any, deps.settingService as any),
  deps,
});

describe('TasksService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('clear', () => {
    it('executa todas as rotinas de limpeza', async () => {
      const { service, deps } = makeService();
      await service.clear();
      // 8 rotinas, cada uma faz um $executeRaw
      expect(deps.prismaService.$executeRaw).toHaveBeenCalledTimes(8);
      expect(deps.settingService.getSettingValues).toHaveBeenCalled();
    });
  });

  describe('clearExpiredMfaChallenges (default de batch limit)', () => {
    it('usa 20000 quando setting ausente', async () => {
      const { service, deps } = makeService();
      deps.settingService.getSettingValues.mockResolvedValue({});
      await (service as any).clearExpiredMfaChallenges();
      const values = deps.prismaService.$executeRaw.mock.calls[0].slice(1);
      expect(values).toContain(20000);
    });

    it('respeita cleanup-batch-limit configurado', async () => {
      const { service, deps } = makeService();
      deps.settingService.getSettingValues.mockResolvedValue({
        'cleanup-batch-limit': 500,
      });
      await (service as any).clearExpiredMfaChallenges();
      const values = deps.prismaService.$executeRaw.mock.calls[0].slice(1);
      expect(values).toContain(500);
    });
  });
});
