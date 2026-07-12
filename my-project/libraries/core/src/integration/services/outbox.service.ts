import { PrismaService } from '@hed-hog/api-prisma';
import { Injectable } from '@nestjs/common';
import { OutboxEvent, OutboxEventStatus } from '../types';

export interface CreateOutboxEventDto {
  eventName: string;
  sourceModule: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
}

export interface OutboxEventPersistenceClient {
  outbox_event: PrismaService['outbox_event'];
}

interface OutboxEventRecord {
  id: number;
  event_name: string;
  source_module: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
  status: OutboxEventStatus;
  attempt_count: number;
  last_error: string | null;
  available_at: Date;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  private toDomainEvent(record: OutboxEventRecord): OutboxEvent {
    return {
      id: String(record.id),
      eventName: record.event_name,
      sourceModule: record.source_module,
      aggregateType: record.aggregate_type,
      aggregateId: record.aggregate_id,
      payload: record.payload,
      status: record.status,
      attemptCount: record.attempt_count,
      lastError: record.last_error,
      availableAt: record.available_at,
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
      availableAt?: Date;
      processedAt?: Date | null;
    },
  ) {
    if (!partialUpdate) {
      return undefined;
    }

    return {
      attempt_count: partialUpdate.attemptCount,
      last_error: partialUpdate.lastError,
      available_at: partialUpdate.availableAt,
      processed_at: partialUpdate.processedAt,
    };
  }

  /**
   * Write a new event to the outbox
   */
  async createEvent(
    dto: CreateOutboxEventDto,
    persistenceClient?: OutboxEventPersistenceClient,
  ): Promise<OutboxEvent> {
    const client = persistenceClient ?? this.prisma;

    const record = await client.outbox_event.create({
      data: {
        event_name: dto.eventName,
        source_module: dto.sourceModule,
        aggregate_type: dto.aggregateType,
        aggregate_id: dto.aggregateId,
        payload: dto.payload,
        status: OutboxEventStatus.PENDING,
        available_at: new Date(),
        attempt_count: 0,
      },
    });

    return this.toDomainEvent(record as OutboxEventRecord);
  }

  /**
   * Atomically claim a batch of pending events using SELECT FOR UPDATE SKIP LOCKED.
   * Prevents duplicate processing across multiple API replicas: each replica gets
   * its own non-overlapping set of rows with no blocking between them.
   */
  async findPendingAndLock(
    limit: number,
    leaseMs: number,
  ): Promise<OutboxEvent[]> {
    const now = new Date();
    const leaseThreshold = new Date(now.getTime() - leaseMs);
    const leaseUntil = new Date(now.getTime() + leaseMs);

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<OutboxEventRecord[]>`
        SELECT * FROM outbox_event
        WHERE status = 'pending'::"outbox_event_status_e5d55ba10d_enum"
           OR (status = 'processing'::"outbox_event_status_e5d55ba10d_enum"
               AND available_at <= ${leaseThreshold})
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;

      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      await tx.$executeRaw`
        UPDATE outbox_event
        SET status = 'processing'::"outbox_event_status_e5d55ba10d_enum",
            available_at = ${leaseUntil},
            updated_at = now()
        WHERE id = ANY(${ids}::int[])
      `;

      return rows.map((r) =>
        this.toDomainEvent({
          ...r,
          status: OutboxEventStatus.PROCESSING,
          available_at: leaseUntil,
        }),
      );
    });
  }

  /**
   * Update event status and related fields
   */
  async updateStatus(
    eventId: string | number,
    status: OutboxEventStatus,
    partialUpdate?: {
      attemptCount?: number;
      lastError?: string | null;
      availableAt?: Date;
      processedAt?: Date | null;
    },
  ): Promise<OutboxEvent> {
    const record = await this.prisma.outbox_event.update({
      where: { id: this.toDatabaseId(eventId) },
      data: {
        status,
        ...this.toDatabaseUpdate(partialUpdate),
      },
    });

    return this.toDomainEvent(record as OutboxEventRecord);
  }

  /**
   * Mark event as processing and set lease time
   */
  async markProcessing(
    eventId: string | number,
    leaseMs: number,
  ): Promise<OutboxEvent> {
    const leaseUntil = new Date(Date.now() + leaseMs);
    return this.updateStatus(eventId, OutboxEventStatus.PROCESSING, {
      availableAt: leaseUntil,
    });
  }

  /**
   * Increment attempt count and optionally update error
   */
  async incrementAttempt(
    eventId: string | number,
    error?: string,
  ): Promise<OutboxEvent> {
    const record = await this.prisma.outbox_event.findUnique({
      where: { id: this.toDatabaseId(eventId) },
    });
    if (!record) {
      throw new Error(`Event ${eventId} not found`);
    }

    const event = this.toDomainEvent(record as OutboxEventRecord);

    return this.updateStatus(eventId, event.status, {
      attemptCount: event.attemptCount + 1,
      lastError: error || null,
    });
  }

  /**
   * Get event by ID
   */
  async getById(eventId: string | number): Promise<OutboxEvent | null> {
    const record = await this.prisma.outbox_event.findUnique({
      where: { id: this.toDatabaseId(eventId) },
    });

    return record ? this.toDomainEvent(record as OutboxEventRecord) : null;
  }

  /**
   * Count events by status
   */
  async countByStatus(status: OutboxEventStatus): Promise<number> {
    return this.prisma.outbox_event.count({
      where: { status },
    });
  }
}
