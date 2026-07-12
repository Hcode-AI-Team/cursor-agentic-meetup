import { PrismaModule } from '@hed-hog/api-prisma';
import { Global, Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingModule } from '../setting/setting.module';
import {
    DomainEventPublisher,
    EventSubscriberRegistry,
    InboxService,
    IntegrationDeveloperApiService,
    IntegrationLinkService,
    IntegrationSettingsService,
    OutboxNotifier,
    OutboxPollingCoordinator,
    OutboxProcessor,
    OutboxProcessorJob,
    OutboxService,
} from './services';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    forwardRef(() => SettingModule),
  ],
  providers: [
    OutboxNotifier,
    OutboxService,
    InboxService,
    IntegrationLinkService,
    EventSubscriberRegistry,
    IntegrationDeveloperApiService,
    IntegrationSettingsService,
    DomainEventPublisher,
    OutboxProcessor,
    OutboxPollingCoordinator,
    OutboxProcessorJob,
  ],
  exports: [
    OutboxNotifier,
    OutboxService,
    InboxService,
    IntegrationLinkService,
    EventSubscriberRegistry,
    IntegrationDeveloperApiService,
    IntegrationSettingsService,
    DomainEventPublisher,
    OutboxProcessor,
    OutboxPollingCoordinator,
    OutboxProcessorJob,
  ],
})
export class IntegrationModule {}
