import { MailModule as MailMainModule } from '@hed-hog/api-mail';
import { PaginationModule } from '@hed-hog/api-pagination';
import { PrismaModule } from '@hed-hog/api-prisma';
import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { AppCommandModule } from '../app-command/app-command.module';
import { IntegrationModule } from '../integration/integration.module';
import { MailModule } from '../mail/mail.module';
import { McpModule } from '../mcp/mcp.module';
import { EventWebhookController } from './event-webhook.controller';
import { EventWebhookService } from './event-webhook.service';
import { IntegrationEventCatalogController } from './integration-event-catalog.controller';
import { IntegrationEventCatalogService } from './integration-event-catalog.service';
import {
  PublicWebhookController,
  WebhookIntegrationController,
} from './webhook-integration.controller';
import { WebhookIntegrationService } from './webhook-integration.service';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => PrismaModule),
    forwardRef(() => PaginationModule),
    forwardRef(() => IntegrationModule),
    forwardRef(() => MailModule),
    forwardRef(() => MailMainModule),
    forwardRef(() => McpModule),
    AppCommandModule,
  ],
  controllers: [
    IntegrationEventCatalogController,
    WebhookIntegrationController,
    PublicWebhookController,
    EventWebhookController,
  ],
  providers: [
    IntegrationEventCatalogService,
    WebhookIntegrationService,
    EventWebhookService,
  ],
  exports: [
    IntegrationEventCatalogService,
    AppCommandModule,
    WebhookIntegrationService,
    EventWebhookService,
  ],
})
export class WebhookIntegrationModule {}

