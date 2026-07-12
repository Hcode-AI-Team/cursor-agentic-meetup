import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const s3InitValidation = jest.fn<any>().mockResolvedValue(undefined);
const localInitValidation = jest.fn<any>().mockResolvedValue(undefined);
const azureInitValidation = jest.fn<any>().mockResolvedValue(undefined);
const gcsInitValidation = jest.fn<any>().mockResolvedValue(undefined);
const spacesInitValidation = jest.fn<any>().mockResolvedValue(undefined);

jest.mock('./s3.provider', () => ({
  S3Provider: jest.fn().mockImplementation((setting: any) => ({
    kind: 'S3Provider',
    setting,
    initValidation: s3InitValidation,
  })),
}));

jest.mock('./local.provider', () => ({
  LocalProvider: jest.fn().mockImplementation((setting: any, jwtService: any) => ({
    kind: 'LocalProvider',
    setting,
    jwtService,
    initValidation: localInitValidation,
  })),
}));

jest.mock('./azure.provider', () => ({
  AzureProvider: jest.fn().mockImplementation((setting: any) => ({
    kind: 'AzureProvider',
    setting,
    initValidation: azureInitValidation,
  })),
}));

jest.mock('./gcs.provider', () => ({
  GCSProvider: jest.fn().mockImplementation((setting: any) => ({
    kind: 'GCSProvider',
    setting,
    initValidation: gcsInitValidation,
  })),
}));

jest.mock('./spaces.provider', () => ({
  SpacesProvider: jest.fn().mockImplementation((setting: any) => ({
    kind: 'SpacesProvider',
    setting,
    initValidation: spacesInitValidation,
  })),
}));

import { ProviderFactory } from './provider.factory';
import { EnumProvider } from './provider.enum';
import { S3Provider } from './s3.provider';
import { LocalProvider } from './local.provider';
import { AzureProvider } from './azure.provider';
import { GCSProvider } from './gcs.provider';
import { SpacesProvider } from './spaces.provider';

describe('ProviderFactory', () => {
  const setting = { foo: 'bar' };
  const jwtService = { sign: jest.fn() } as any;

  afterEach(() => jest.clearAllMocks());

  it('cria S3Provider para EnumProvider.S3 e roda initValidation', async () => {
    const provider = await ProviderFactory.create(EnumProvider.S3, setting, jwtService);
    expect(S3Provider).toHaveBeenCalledWith(setting);
    expect(s3InitValidation).toHaveBeenCalledTimes(1);
    expect((provider as any).kind).toBe('S3Provider');
  });

  it('cria LocalProvider para EnumProvider.LOCAL passando o jwtService', async () => {
    const provider = await ProviderFactory.create(EnumProvider.LOCAL, setting, jwtService);
    expect(LocalProvider).toHaveBeenCalledWith(setting, jwtService);
    expect(localInitValidation).toHaveBeenCalledTimes(1);
    expect((provider as any).kind).toBe('LocalProvider');
  });

  it('cria AzureProvider para EnumProvider.AZURE', async () => {
    const provider = await ProviderFactory.create(EnumProvider.AZURE, setting, jwtService);
    expect(AzureProvider).toHaveBeenCalledWith(setting);
    expect(azureInitValidation).toHaveBeenCalledTimes(1);
    expect((provider as any).kind).toBe('AzureProvider');
  });

  it('cria GCSProvider para EnumProvider.GCS', async () => {
    const provider = await ProviderFactory.create(EnumProvider.GCS, setting, jwtService);
    expect(GCSProvider).toHaveBeenCalledWith(setting);
    expect(gcsInitValidation).toHaveBeenCalledTimes(1);
    expect((provider as any).kind).toBe('GCSProvider');
  });

  it('cria SpacesProvider para EnumProvider.SPACES', async () => {
    const provider = await ProviderFactory.create(EnumProvider.SPACES, setting, jwtService);
    expect(SpacesProvider).toHaveBeenCalledWith(setting);
    expect(spacesInitValidation).toHaveBeenCalledTimes(1);
    expect((provider as any).kind).toBe('SpacesProvider');
  });

  it('lança erro para tipo de provider não suportado', async () => {
    await expect(
      ProviderFactory.create('invalid' as EnumProvider, setting, jwtService),
    ).rejects.toThrow('Unsupported provider type: invalid');
  });

  it('propaga erro lançado por initValidation (ex.: configuração inválida)', async () => {
    s3InitValidation.mockRejectedValueOnce(new Error('missing key'));
    await expect(
      ProviderFactory.create(EnumProvider.S3, setting, jwtService),
    ).rejects.toThrow('missing key');
  });
});
