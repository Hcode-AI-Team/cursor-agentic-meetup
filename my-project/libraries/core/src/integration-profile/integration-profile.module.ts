import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { forwardRef, Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module';
import { IntegrationCredentialCryptoService } from './integration-credential-crypto.service';
import { IntegrationProfileController } from './integration-profile.controller';
import { IntegrationProfileService } from './integration-profile.service';

@Module({
  imports: [
    forwardRef(() => PrismaModule),
    forwardRef(() => PaginationModule),
    forwardRef(() => SecurityModule),
  ],
  controllers: [IntegrationProfileController],
  providers: [IntegrationProfileService, IntegrationCredentialCryptoService],
  exports: [IntegrationProfileService, IntegrationCredentialCryptoService],
})
export class IntegrationProfileModule {}
