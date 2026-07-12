import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('sharp', () => {
  const instance: any = {
    metadata: jest.fn(),
    resize: jest.fn(),
    webp: jest.fn(),
    jpeg: jest.fn(),
    png: jest.fn(),
    toBuffer: jest.fn(),
  };
  const fn: any = jest.fn(() => instance);
  fn.__instance = instance;
  return { __esModule: true, default: fn };
});

import sharp from 'sharp';
import { ImageOptimizationService } from './image-optimization.service';

const mockSharp = sharp as unknown as jest.Mock & { __instance: any };

const DEFAULT_SETTINGS: Record<string, string | undefined> = {
  'image-compression-enabled': 'false',
  'image-compression-quality': undefined,
  'image-compression-types': undefined,
  'image-webp-conversion-enabled': 'false',
  'image-webp-convert-types': undefined,
  'image-max-dimension': undefined,
};

const makeService = (settings: Record<string, string | undefined> = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  const settingService = {
    getSettingValues: jest.fn(async () => merged),
  };
  const service = new ImageOptimizationService(settingService as any);
  return { service, settingService, merged };
};

describe('ImageOptimizationService', () => {
  beforeEach(() => {
    const inst = mockSharp.__instance;
    mockSharp.mockClear();
    inst.metadata.mockReset();
    inst.resize.mockReset().mockReturnValue(inst);
    inst.webp.mockReset().mockReturnValue(inst);
    inst.jpeg.mockReset().mockReturnValue(inst);
    inst.png.mockReset().mockReturnValue(inst);
    inst.toBuffer.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseArraySetting (privado)', () => {
    it('faz parse de JSON array válido', () => {
      const { service } = makeService();
      expect((service as any).parseArraySetting('["a","b"]')).toEqual(['a', 'b']);
    });

    it('retorna [] para undefined', () => {
      const { service } = makeService();
      expect((service as any).parseArraySetting(undefined)).toEqual([]);
    });

    it('retorna [] para JSON inválido', () => {
      const { service } = makeService();
      expect((service as any).parseArraySetting('{not json')).toEqual([]);
    });

    it('retorna [] quando o JSON não é um array', () => {
      const { service } = makeService();
      expect((service as any).parseArraySetting('{"a":1}')).toEqual([]);
    });
  });

  describe('replaceExtension (privado)', () => {
    it('troca a extensão preservando o nome base', () => {
      const { service } = makeService();
      expect((service as any).replaceExtension('photo.jpg', 'webp')).toBe('photo.webp');
      expect((service as any).replaceExtension('a.b.png', 'webp')).toBe('a.b.webp');
      expect((service as any).replaceExtension('noext', 'png')).toBe('noext.png');
    });
  });

  describe('pngCompressionLevel (privado)', () => {
    it('inverte a escala de quality para 0-9', () => {
      const { service } = makeService();
      expect((service as any).pngCompressionLevel(100)).toBe(0);
      expect((service as any).pngCompressionLevel(80)).toBe(2);
      expect((service as any).pngCompressionLevel(1)).toBe(9);
    });
  });

  describe('detectImageMimetype', () => {
    it('mapeia o format do sharp para o MIME', async () => {
      const { service } = makeService();
      mockSharp.__instance.metadata.mockResolvedValue({ format: 'jpeg' });
      expect(await service.detectImageMimetype(Buffer.from('x'))).toBe('image/jpeg');

      mockSharp.__instance.metadata.mockResolvedValue({ format: 'png' });
      expect(await service.detectImageMimetype(Buffer.from('x'))).toBe('image/png');
    });

    it('retorna null para format desconhecido', async () => {
      const { service } = makeService();
      mockSharp.__instance.metadata.mockResolvedValue({ format: 'xyz' });
      expect(await service.detectImageMimetype(Buffer.from('x'))).toBeNull();
    });

    it('retorna null quando não há format', async () => {
      const { service } = makeService();
      mockSharp.__instance.metadata.mockResolvedValue({});
      expect(await service.detectImageMimetype(Buffer.from('x'))).toBeNull();
    });

    it('retorna null quando o sharp lança (buffer não é imagem)', async () => {
      const { service } = makeService();
      mockSharp.__instance.metadata.mockRejectedValue(new Error('bad'));
      expect(await service.detectImageMimetype(Buffer.from('x'))).toBeNull();
    });
  });

  describe('optimizeBuffer', () => {
    it('não toca em não-imagens e nem lê settings', async () => {
      const { service, settingService } = makeService();
      const buffer = Buffer.from('pdf');
      const result = await service.optimizeBuffer(buffer, 'application/pdf', 'doc.pdf');
      expect(result).toEqual({ buffer, mimetype: 'application/pdf', originalname: 'doc.pdf' });
      expect(settingService.getSettingValues).not.toHaveBeenCalled();
    });

    it('retorna o original quando não há resize, compressão nem conversão', async () => {
      const { service } = makeService();
      const buffer = Buffer.from('img');
      const result = await service.optimizeBuffer(buffer, 'image/jpeg', 'a.jpg');
      expect(result).toEqual({ buffer, mimetype: 'image/jpeg', originalname: 'a.jpg' });
      expect(mockSharp).not.toHaveBeenCalled();
    });

    it('converte para webp quando habilitado e o tipo está na lista', async () => {
      const { service } = makeService({
        'image-webp-conversion-enabled': 'true',
        'image-webp-convert-types': '["image/jpeg"]',
        'image-compression-quality': '70',
      });
      const out = Buffer.from('webp-bytes');
      mockSharp.__instance.toBuffer.mockResolvedValue(out);

      const result = await service.optimizeBuffer(Buffer.from('img'), 'image/jpeg', 'photo.jpg');

      expect(result).toEqual({
        buffer: out,
        mimetype: 'image/webp',
        originalname: 'photo.webp',
      });
      expect(mockSharp.__instance.webp).toHaveBeenCalledWith({ quality: 70 });
    });

    it('comprime jpeg mantendo o mesmo mimetype/nome', async () => {
      const { service } = makeService({
        'image-compression-enabled': 'true',
        'image-compression-types': '["image/jpeg"]',
        'image-compression-quality': '60',
      });
      const out = Buffer.from('jpeg-small');
      mockSharp.__instance.toBuffer.mockResolvedValue(out);

      const result = await service.optimizeBuffer(Buffer.from('img'), 'image/jpeg', 'a.jpg');

      expect(result).toEqual({ buffer: out, mimetype: 'image/jpeg', originalname: 'a.jpg' });
      expect(mockSharp.__instance.jpeg).toHaveBeenCalledWith({ quality: 60 });
    });

    it('comprime png usando compressionLevel derivado da quality', async () => {
      const { service } = makeService({
        'image-compression-enabled': 'true',
        'image-compression-types': '["image/png"]',
        'image-compression-quality': '80',
      });
      const out = Buffer.from('png-small');
      mockSharp.__instance.toBuffer.mockResolvedValue(out);

      const result = await service.optimizeBuffer(Buffer.from('img'), 'image/png', 'a.png');

      expect(result.mimetype).toBe('image/png');
      // quality 80 -> compressionLevel 2
      expect(mockSharp.__instance.png).toHaveBeenCalledWith({ compressionLevel: 2 });
    });

    it('converte bmp/tiff para png', async () => {
      const { service } = makeService({
        'image-compression-enabled': 'true',
        'image-compression-types': '["image/tiff"]',
      });
      const out = Buffer.from('png-from-tiff');
      mockSharp.__instance.toBuffer.mockResolvedValue(out);

      const result = await service.optimizeBuffer(Buffer.from('img'), 'image/tiff', 'scan.tiff');

      expect(result).toEqual({
        buffer: out,
        mimetype: 'image/png',
        originalname: 'scan.png',
      });
    });

    it('aplica resize por max-dimension com fit inside', async () => {
      const { service } = makeService({ 'image-max-dimension': '1024' });
      const out = Buffer.from('resized');
      mockSharp.__instance.toBuffer.mockResolvedValue(out);

      const result = await service.optimizeBuffer(Buffer.from('img'), 'image/jpeg', 'a.jpg');

      expect(mockSharp.__instance.resize).toHaveBeenCalledWith({
        width: 1024,
        height: 1024,
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(result.buffer).toBe(out);
    });

    it('o alvo preciso (maxWidth/maxHeight) tem prioridade sobre max-dimension', async () => {
      const { service } = makeService({ 'image-max-dimension': '1024' });
      mockSharp.__instance.toBuffer.mockResolvedValue(Buffer.from('cropped'));

      await service.optimizeBuffer(Buffer.from('img'), 'image/jpeg', 'a.jpg', {
        maxWidth: 200,
        maxHeight: 100,
      });

      expect(mockSharp.__instance.resize).toHaveBeenCalledWith({
        width: 200,
        height: 100,
        fit: 'cover',
      });
    });

    it('formato desconhecido com resize apenas re-encoda o buffer', async () => {
      const { service } = makeService({ 'image-max-dimension': '500' });
      const out = Buffer.from('reencoded');
      mockSharp.__instance.toBuffer.mockResolvedValue(out);

      const result = await service.optimizeBuffer(Buffer.from('img'), 'image/gif', 'a.gif');

      expect(result).toEqual({ buffer: out, mimetype: 'image/gif', originalname: 'a.gif' });
      expect(mockSharp.__instance.jpeg).not.toHaveBeenCalled();
      expect(mockSharp.__instance.png).not.toHaveBeenCalled();
    });

    it('faz fallback para o original quando o sharp lança', async () => {
      const { service } = makeService({
        'image-compression-enabled': 'true',
        'image-compression-types': '["image/jpeg"]',
      });
      mockSharp.__instance.toBuffer.mockRejectedValue(new Error('sharp boom'));
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);
      const buffer = Buffer.from('img');

      const result = await service.optimizeBuffer(buffer, 'image/jpeg', 'a.jpg');

      expect(result).toEqual({ buffer, mimetype: 'image/jpeg', originalname: 'a.jpg' });
      expect(warnSpy).toHaveBeenCalled();
    });

    it('faz clamp da quality inválida para o default 80', async () => {
      const { service } = makeService({
        'image-compression-enabled': 'true',
        'image-compression-types': '["image/jpeg"]',
        'image-compression-quality': 'not-a-number',
      });
      mockSharp.__instance.toBuffer.mockResolvedValue(Buffer.from('x'));

      await service.optimizeBuffer(Buffer.from('img'), 'image/jpeg', 'a.jpg');

      expect(mockSharp.__instance.jpeg).toHaveBeenCalledWith({ quality: 80 });
    });
  });
});
