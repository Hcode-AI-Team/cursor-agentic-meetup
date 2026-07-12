import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { EnumProvider } from '../file/provider/provider.enum';
import {
  buildMailConfigFromIntegration,
  getFromAddress,
  getReplyToAddress,
  buildStorageConfigFromIntegration,
  resolveStorageEnumProvider,
  resolveFileProviderSlug,
  buildOAuthConfigFromIntegration,
  buildDigitalOceanConfigFromIntegration,
  buildKubernetesConfigFromIntegration,
  buildAiConfigFromIntegration,
} from './integration-profile.utils';

describe('integration-profile.utils', () => {
  describe('buildMailConfigFromIntegration', () => {
    it('mapeia smtp com valores fornecidos', () => {
      const result = buildMailConfigFromIntegration('smtp', {
        host: 'mail.example.com',
        port: 465,
        secure: true,
        username: 'user',
        password: 'pass',
      });

      expect(result).toEqual({
        global: true,
        type: 'SMTP',
        host: 'mail.example.com',
        port: 465,
        secure: true,
        username: 'user',
        password: 'pass',
      });
    });

    it('aplica defaults de smtp quando config vazia', () => {
      const result = buildMailConfigFromIntegration('SMTP', {});
      expect(result).toMatchObject({
        type: 'SMTP',
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
      });
    });

    it('trata config null aplicando defaults', () => {
      const result = buildMailConfigFromIntegration('smtp', null);
      expect(result.host).toBe('');
      expect(result.port).toBe(587);
    });

    it('mapeia gmail', () => {
      const result = buildMailConfigFromIntegration('gmail', {
        client_id: 'cid',
        client_secret: 'secret',
        refresh_token: 'rt',
        from_email: 'a@b.com',
      });
      expect(result).toEqual({
        global: true,
        type: 'GMAIL',
        clientId: 'cid',
        clientSecret: 'secret',
        refreshToken: 'rt',
        from: 'a@b.com',
      });
    });

    it('mapeia ses', () => {
      const result = buildMailConfigFromIntegration('ses', {
        region: 'us-east-1',
        access_key_id: 'ak',
        secret_access_key: 'sk',
        from_email: 'a@b.com',
      });
      expect(result).toEqual({
        global: true,
        type: 'SES',
        region: 'us-east-1',
        accessKeyId: 'ak',
        secretAccessKey: 'sk',
        from: 'a@b.com',
      });
    });

    it('lança BadRequestException para provider desconhecido', () => {
      expect(() => buildMailConfigFromIntegration('mailgun', {})).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFromAddress', () => {
    it('formata com nome e email', () => {
      expect(
        getFromAddress({ from_email: 'a@b.com', from_name: 'Alice' }),
      ).toBe('Alice <a@b.com>');
    });

    it('retorna apenas email quando sem nome', () => {
      expect(getFromAddress({ from_email: 'a@b.com' })).toBe('a@b.com');
    });

    it('trata config null', () => {
      expect(getFromAddress(null)).toBe('');
    });
  });

  describe('getReplyToAddress', () => {
    it('retorna undefined quando reply-to vazio', () => {
      expect(getReplyToAddress({})).toBeUndefined();
      expect(getReplyToAddress({ reply_to_email: '   ' })).toBeUndefined();
    });

    it('formata com nome', () => {
      expect(
        getReplyToAddress({ reply_to_email: 'r@b.com', reply_to_name: 'Bob' }),
      ).toBe('Bob <r@b.com>');
    });

    it('retorna apenas email quando sem nome', () => {
      expect(getReplyToAddress({ reply_to_email: 'r@b.com' })).toBe('r@b.com');
    });
  });

  describe('buildStorageConfigFromIntegration', () => {
    it('mapeia local com default de path', () => {
      expect(buildStorageConfigFromIntegration('local', {})).toEqual({
        'storage-local-path': 'storage',
      });
      expect(
        buildStorageConfigFromIntegration('local', { base_path: 'files' }),
      ).toEqual({ 'storage-local-path': 'files' });
    });

    it('mapeia s3 com defaults', () => {
      expect(buildStorageConfigFromIntegration('s3', {})).toEqual({
        'storage-s3-key': '',
        'storage-s3-secret': '',
        'storage-s3-region': 'us-east-1',
        'storage-s3-bucket': '',
      });
    });

    it('mapeia gcs', () => {
      expect(
        buildStorageConfigFromIntegration('gcs', {
          key_file_json: '{}',
          bucket: 'b',
        }),
      ).toEqual({
        'storage-gcs-keyfile': '{}',
        'storage-gcs-bucket': 'b',
      });
    });

    it('mapeia azure-blob', () => {
      expect(
        buildStorageConfigFromIntegration('azure-blob', {
          account: 'acc',
          key: 'k',
          container: 'c',
        }),
      ).toEqual({
        'storage-abs-account': 'acc',
        'storage-abs-key': 'k',
        'storage-abs-container': 'c',
      });
    });

    it('mapeia s3-compatible', () => {
      expect(
        buildStorageConfigFromIntegration('s3-compatible', {
          access_key_id: 'ak',
          secret_access_key: 'sk',
          region: 'nyc3',
          bucket: 'b',
          endpoint: 'cdn.example.com',
        }),
      ).toEqual({
        'storage-spaces-key': 'ak',
        'storage-spaces-secret': 'sk',
        'storage-spaces-region': 'nyc3',
        'storage-spaces-bucket': 'b',
        'storage-spaces-cdn': 'cdn.example.com',
      });
    });

    it('lança para provider desconhecido', () => {
      expect(() =>
        buildStorageConfigFromIntegration('dropbox', {}),
      ).toThrow(BadRequestException);
    });
  });

  describe('resolveStorageEnumProvider', () => {
    it('mapeia cada slug conhecido', () => {
      expect(resolveStorageEnumProvider('local')).toBe(EnumProvider.LOCAL);
      expect(resolveStorageEnumProvider('S3')).toBe(EnumProvider.S3);
      expect(resolveStorageEnumProvider('gcs')).toBe(EnumProvider.GCS);
      expect(resolveStorageEnumProvider('azure-blob')).toBe(EnumProvider.AZURE);
      expect(resolveStorageEnumProvider('s3-compatible')).toBe(
        EnumProvider.SPACES,
      );
    });

    it('lança para slug desconhecido', () => {
      expect(() => resolveStorageEnumProvider('foo')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolveFileProviderSlug', () => {
    it('normaliza slugs especiais', () => {
      expect(resolveFileProviderSlug('azure-blob')).toBe('abs');
      expect(resolveFileProviderSlug('s3-compatible')).toBe('spaces');
    });

    it('faz lowercase para outros slugs', () => {
      expect(resolveFileProviderSlug('S3')).toBe('s3');
      expect(resolveFileProviderSlug('Local')).toBe('local');
    });
  });

  describe('buildOAuthConfigFromIntegration', () => {
    it('inclui tenantId quando fornecido', () => {
      expect(
        buildOAuthConfigFromIntegration('microsoft', {
          client_id: 'cid',
          client_secret: 'sec',
          tenant_id: 'tid',
        }),
      ).toEqual({ clientId: 'cid', clientSecret: 'sec', tenantId: 'tid' });
    });

    it('omite tenantId quando ausente', () => {
      expect(
        buildOAuthConfigFromIntegration('google', {
          client_id: 'cid',
          client_secret: 'sec',
        }),
      ).toEqual({ clientId: 'cid', clientSecret: 'sec' });
    });
  });

  describe('buildDigitalOceanConfigFromIntegration', () => {
    it('mapeia digitalocean', () => {
      expect(
        buildDigitalOceanConfigFromIntegration('digitalocean', {
          api_token: 't',
          cluster_id: 'c',
          region: 'nyc',
          video_node_pool_id: 'p',
          video_node_pool_name: 'pool',
        }),
      ).toEqual({
        apiToken: 't',
        clusterId: 'c',
        region: 'nyc',
        videoNodePoolId: 'p',
        videoNodePoolName: 'pool',
      });
    });

    it('lança para provider desconhecido', () => {
      expect(() =>
        buildDigitalOceanConfigFromIntegration('aws', {}),
      ).toThrow(BadRequestException);
    });
  });

  describe('buildKubernetesConfigFromIntegration', () => {
    it('mapeia kubernetes com default de namespace', () => {
      expect(
        buildKubernetesConfigFromIntegration('kubernetes', {
          api_server: 'https://k8s',
          token: 'tok',
          ca_cert: 'cert',
        }),
      ).toEqual({
        apiServer: 'https://k8s',
        token: 'tok',
        caCert: 'cert',
        namespace: 'hcode',
      });
    });

    it('lança para provider desconhecido', () => {
      expect(() =>
        buildKubernetesConfigFromIntegration('nomad', {}),
      ).toThrow(BadRequestException);
    });
  });

  describe('buildAiConfigFromIntegration', () => {
    it('mapeia openai com organization', () => {
      expect(
        buildAiConfigFromIntegration('openai', {
          api_key: 'k',
          organization: 'org',
        }),
      ).toEqual({ apiKey: 'k', organization: 'org' });
    });

    it('mapeia openai sem organization', () => {
      expect(buildAiConfigFromIntegration('openai', { api_key: 'k' })).toEqual({
        apiKey: 'k',
      });
    });

    it('mapeia gemini e claude apenas com apiKey', () => {
      expect(buildAiConfigFromIntegration('gemini', { api_key: 'g' })).toEqual({
        apiKey: 'g',
      });
      expect(buildAiConfigFromIntegration('claude', { api_key: 'c' })).toEqual({
        apiKey: 'c',
      });
    });

    it('lança para provider desconhecido', () => {
      expect(() => buildAiConfigFromIntegration('llama', {})).toThrow(
        BadRequestException,
      );
    });
  });
});
