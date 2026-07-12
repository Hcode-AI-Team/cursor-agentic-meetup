/**
 * EXAMPLE: How a Module Uses the Integration Foundation
 *
 * This example shows how the finance or operations module would use
 * the core integration infrastructure to publish events and handle
 * events from other modules.
 */

// ============================================================================
// STEP 1: Publish a Domain Event from Finance Module
// ============================================================================

import { Injectable } from '@nestjs/common';
import { IntegrationDeveloperApiService } from '@hed-hog/core';
import { PrismaService } from '@hed-hog/api-prisma';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationApi: IntegrationDeveloperApiService,
  ) {}

  async createInvoice(data: any): Promise<any> {
    // Create the invoice
    const invoice = await this.prisma.invoice.create({ data });

    // Publish event that other modules can subscribe to
    await this.integrationApi.publishEvent({
      eventName: 'invoice.created',
      sourceModule: 'finance',
      aggregateType: 'Invoice',
      aggregateId: invoice.id,
      payload: {
        invoiceId: invoice.id,
        amount: invoice.amount,
        customerId: invoice.customerId,
      },
      metadata: {
        producer: 'finance',
      },
    });

    return invoice;
  }

  async cancelInvoice(invoiceId: string): Promise<void> {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });

    // Notify subscribers
    await this.integrationApi.publishEvent({
      eventName: 'invoice.cancelled',
      sourceModule: 'finance',
      aggregateType: 'Invoice',
      aggregateId: invoiceId,
      payload: { invoiceId },
    });
  }
}

// ============================================================================
// STEP 2: Register Event Handlers in Operations Module
// ============================================================================

import { Injectable, OnModuleInit} from '@nestjs/common';
import {
  IntegrationDeveloperApiService,
  DomainEvent,
  SubscriberContext,
  LinkType,
} from '@hed-hog/core';
import { PrismaService } from '@hed-hog/api-prisma';

@Injectable()
export class OperationsEventHandlers implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationApi: IntegrationDeveloperApiService,
  ) {}

  onModuleInit(): void {
    // Register handler for invoice.created event
    this.integrationApi.subscribe({
      eventName: 'invoice.created',
      consumerName: 'operations-module',
      priority: 10,
      handler: async (event: DomainEvent, context: SubscriberContext) => {
        await this.onInvoiceCreated(event, context);
      },
    });

    // Register handler for invoice.cancelled event
    this.integrationApi.subscribe({
      eventName: 'invoice.cancelled',
      consumerName: 'operations-module',
      priority: 10,
      handler: async (event: DomainEvent, context: SubscriberContext) => {
        await this.onInvoiceCancelled(event, context);
      },
    });
  }

  /**
   * Handle invoice.created event
   * This might trigger operational workflows, create tasks, etc.
   */
  private async onInvoiceCreated(
    event: DomainEvent,
    context: SubscriberContext,
  ): Promise<void> {
    context.logger.log(`Processing invoice creation: ${event.aggregateId}`);

    const { invoiceId, customerId, amount } = event.payload;

    // Create an operational task
    const task = await this.prisma.task.create({
      data: {
        title: `Process invoice ${invoiceId}`,
        description: `Invoice for amount ${amount} from customer ${customerId}`,
        status: 'PENDING',
      },
    });

    // Create an integration link between the finance invoice and operations task
    await context.linkService.createLink({
      sourceModule: 'finance',
      sourceEntityType: 'Invoice',
      sourceEntityId: invoiceId,
      targetModule: 'operations',
      targetEntityType: 'Task',
      targetEntityId: task.id,
      linkType: LinkType.CASCADE,
      metadata: {
        reason: 'workflow_trigger',
        invoiceAmount: amount,
      },
    });

    context.logger.log(
      `Created task ${task.id} for invoice ${invoiceId}`,
    );
  }

  /**
   * Handle invoice.cancelled event
   */
  private async onInvoiceCancelled(
    event: DomainEvent,
    context: SubscriberContext,
  ): Promise<void> {
    context.logger.log(`Processing invoice cancellation: ${event.aggregateId}`);

    const { invoiceId } = event.payload;

    // Find linked tasks
    const links = await context.linkService.findOutbound(
      'finance',
      'Invoice',
      invoiceId,
    );

    for (const link of links) {
      // Cancel related tasks
      if (link.targetModule === 'operations' && link.targetEntityType === 'Task') {
        await this.prisma.task.update({
          where: { id: link.targetEntityId },
          data: { status: 'CANCELLED' },
        });

        context.logger.log(
          `Cancelled task ${link.targetEntityId} due to invoice cancellation`,
        );
      }
    }
  }
}

// ============================================================================
// STEP 3: Register Handlers in Operations Module DI
// ============================================================================

import { Module } from '@nestjs/common';

@Module({
  providers: [OperationsEventHandlers],
})
export class OperationsModule {
  // OperationsEventHandlers will be instantiated and its onModuleInit()
  // will be called automatically, registering event handlers
}

// ============================================================================
// STEP 4: Query Integration Links to Find Related Entities
// ============================================================================

import { Injectable } from '@nestjs/common';
import { IntegrationDeveloperApiService, LinkType } from '@hed-hog/core';

@Injectable()
export class InvoiceQueryService {
  constructor(
    private readonly integrationApi: IntegrationDeveloperApiService,
  ) {}

  /**
   * Find all operational tasks related to an invoice
   */
  async getRelatedTasks(invoiceId: string): Promise<any[]> {
    const links = await this.integrationApi.findLinksBySource({
      module: 'finance',
      entityType: 'Invoice',
      entityId: invoiceId,
    });

    const taskLinks = links.filter(
      (link) => link.targetModule === 'operations' && link.targetEntityType === 'Task',
    );

    return taskLinks.map((link) => link.targetEntityId);
  }

  /**
   * Find the invoice that triggered a task
   */
  async getSourceInvoice(taskId: string): Promise<string | null> {
    const links = await this.integrationApi.findLinksByTarget({
      module: 'operations',
      entityType: 'Task',
      entityId: taskId,
    });

    const invoiceLink = links.find(
      (link) => link.sourceModule === 'finance' && link.sourceEntityType === 'Invoice',
    );

    return invoiceLink?.sourceEntityId || null;
  }
}

// ============================================================================
// ARCHITECTURE NOTES
// ============================================================================

/**
 * KEY PRINCIPLES:
 *
 * 1. DURABLE OUTBOX
 *    - Events are written to the database outbox table first
 *    - In-memory notification wakes up processor (optional acceleration)
 *    - On crashes/restarts, processor catches up on pending events
 *    - No events are lost
 *
 * 2. IDEMPOTENT PROCESSING
 *    - Each consumer has an inbox entry per outbox event
 *    - Unique constraint prevents duplicate processing
 *    - If a handler crashes mid-execution, retry will recognize it was attempted
 *    - Handlers must be idempotent at the application logic level
 *
 * 3. CROSS-MODULE DECOUPLING
 *    - Modules publish events but don't depend on other modules' internals
 *    - Integration links are explicit, queryable, and metadata-rich
 *    - No direct FK relationships across module boundaries
 *    - Modules self-register handlers, core doesn't know about them
 *
 * 4. CONFIGURABILITY
 *    - All timing/retry/batch/scope settings are in the core SettingService
 *    - Operations/infrastructure teams can tune without code changes
 *    - Settings can be changed at runtime
 *
 * 5. FAILURE RECOVERY
 *    - Exponential backoff on handler failures
 *    - Configurable max attempts
 *    - Dead letter queue for poisoned events
 *    - Processing lease time prevents stuck events
 *    - Startup drain recovers pending events after restart
 */
