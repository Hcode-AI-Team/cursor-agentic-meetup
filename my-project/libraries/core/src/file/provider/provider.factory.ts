import { JwtService } from '@nestjs/jwt';
import { AbstractProvider } from './abstract.provider';
import { AzureProvider } from './azure.provider';
import { GCSProvider } from './gcs.provider';
import { LocalProvider } from './local.provider';
import { EnumProvider } from './provider.enum';
import { S3Provider } from './s3.provider';
import { SpacesProvider } from './spaces.provider';

export class ProviderFactory {
  static async create(
    providerType: EnumProvider,
    setting: Record<string, string>,
    jwtService: JwtService,
  ): Promise<AbstractProvider> {
    let provider: AbstractProvider;

    switch (providerType) {
      case EnumProvider.S3:
        provider = new S3Provider(setting);
        break;
      case EnumProvider.LOCAL:
        provider = new LocalProvider(setting, jwtService);
        break;
      case EnumProvider.AZURE:
        provider = new AzureProvider(setting);
        break;
      case EnumProvider.GCS:
        provider = new GCSProvider(setting);
        break;
      case EnumProvider.SPACES:
        provider = new SpacesProvider(setting);
        break;
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }

    await provider.initValidation();
    return provider;
  }
}
