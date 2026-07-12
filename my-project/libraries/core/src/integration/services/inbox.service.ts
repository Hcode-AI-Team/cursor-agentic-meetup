import { PrismaService } from '@hed-hog/api-prisma';
import { Injectable } from '@nestjs/common';
import { InboxEvent, InboxEventStatus } from '../types';

interface InboxEventRecord {
  id: number;
  outbox_event_id: number;
  consumer_name: string;
  status: InboxEventStatus;
  attempt_count: number;
  last_error: string | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  private toDomainEvent(record: InboxEventRecord): InboxEvent {
    return {
      id: String(record.id),
      outboxEventId: String(record.outbox_event_id),
      consumerName: record.consumer_name,
      status: record.status,
      attemptCount: record.attempt_count,
      lastError: record.last_error,
      processedAt: record.processed_at,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private toDatabaseId(eventId: string | number): number {
    return typeof eventId === 'number' ? eventId : Number(eventId);
  }

  private toDatabaseUpdate(
    partialUpdate?: {
      attemptCount?: number;
      lastError?: string | null;
      processedAt?: Date | null;
    },
  ) {
    if (!partialUpdate) {
      return undefined;
    }

    return {
      attempt_count: partialUpdate.attemptCount,
      last_error: partialUpdate.lastError,
      processed_at: partialUpdate.processedAt,
    };
  }

  /**
   * Get or create inbox event for idempotency tracking
   * Returns existing if already processed, otherwise creates new
   */
  async getOrCreate(
    outboxEventId: string | number,
    consumerName: string,
  ): Promise<InboxEvent> {
    // Try to find existing
    let inboxEvent = await this.prisma.inbox_event.findFirst({
      where: {
        outbox_event_id: this.toDatabaseId(outboxEventId),
        consumer_name: consumerName,
      },
    });

    // Create if doesn't exist
    if (!inboxEvent) {
      inboxEvent = await this.prisma.inbox_event.create({
        data: {
          outbox_event_id: this.toDatabaseId(outboxEventId),
          consumer_name: consumerName,
          status: InboxEventStatus.RECEIVED,
          attempt_count: 0,
        },
      });
    }

    return this.toDomainEvent(inboxEvent as InboxEventRecord);
  }

  /**
   * Update inbox event status
   */
  async updateStatus(
    inboxEventId: string | number,
    status: InboxEventStatus,
    partialUpdate?: {
      attemptCount?: number;
      lastError?: string | null;
      processedAt?: Date | null;
    },
  ): Promise<InboxEvent> {
    const inboxEvent = await this.prisma.inbox_event.update({
      where: { id: this.toDatabaseId(inboxEventId) },
      data: {
        status,
        ...this.toDatabaseUpdate(partialUpdate),
      },
    });

    return this.toDomainEvent(inboxEvent as InboxEventRecord);
  }

  /**
   * Mark inbox event as processing
   */
  async markProcessing(inboxEventId: string | number): Promise<InboxEvent> {
    return this.updateStatus(inboxEventId, InboxEventStatus.PROCESSING);
  }

  /**
   * Mark inbox event as successfully processed
   */
  async markProcessed(inboxEventId: string | number): Promise<InboxEvent> {
    return this.updateStatus(inboxEventId, InboxEventStatus.PROCESSED, {
      processedAt: new Date(),
    });
  }

  /**
   * Mark inbox event as failed
   */
  async markFailed(
    inboxEventId: string | number,
    error: string,
  ): Promise<InboxEvent> {
    const record = await this.prisma.inbox_event.findUnique({
      where: { id: this.toDatabaseId(inboxEventId) },
    });
    if (!record) {
      throw new Error(`Inbox event ${inboxEventId} not found`);
    }

    const inboxEvent = this.toDomainEvent(record as InboxEventRecord);

    return this.updateStatus(inboxEventId, InboxEventStatus.FAILED, {
      attemptCount: inboxEvent.attemptCount + 1,
      lastError: error,
    });
  }

  /**
   * Mark inbox event as skipped
   */
  async markSkipped(inboxEventId: string | number): Promise<InboxEvent> {
    return this.updateStatus(inboxEventId, InboxEventStatus.SKIPPED);
  }

  /**
   * Increment attempt count
   */
  async incrementAttempt(inboxEventId: string | number): Promise<InboxEvent> {
    const record = await this.prisma.inbox_event.findUnique({
      where: { id: this.toDatabaseId(inboxEventId) },
    });
    if (!record) {
      throw new Error(`Inbox event ${inboxEventId} not found`);
    }

    const inboxEvent = this.toDomainEvent(record as InboxEventRecord);

    return this.updateStatus(inboxEventId, inboxEvent.status, {
      attemptCount: inboxEvent.attemptCount + 1,
    });
  }

  /**
   * Get inbox event by ID
   */
  async getById(inboxEventId: string | number): Promise<InboxEvent | null> {
    const inboxEvent = await this.prisma.inbox_event.findUnique({
      where: { id: this.toDatabaseId(inboxEventId) },
    });

    return inboxEvent ? this.toDomainEvent(inboxEvent as InboxEventRecord) : null;
  }

  /**
   * Check if event was already processed by consumer
   */
  async isProcessed(
    outboxEventId: string | number,
    consumerName: string,
  ): Promise<boolean> {
    const inboxEvent = await this.prisma.inbox_event.findFirst({
      where: {
        outbox_event_id: this.toDatabaseId(outboxEventId),
        consumer_name: consumerName,
      },
    });

    return (
      inboxEvent !== null &&
      (inboxEvent as InboxEventRecord).status === InboxEventStatus.PROCESSED
    );
  }

  /**
   * Count unprocessed items for a consumer
   */
  async countUnprocessed(consumerName: string): Promise<number> {
    return this.prisma.inbox_event.count({
      where: {
        consumer_name: consumerName,
        status: {
          notIn: [InboxEventStatus.PROCESSED, InboxEventStatus.SKIPPED],
        },
      },
    });
  }
}
