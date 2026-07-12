import { PrismaService } from '@hed-hog/api-prisma';
import { Injectable } from '@nestjs/common';
import { IntegrationLink, LinkType } from '../types';

export interface CreateIntegrationLinkDto {
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  targetModule: string;
  targetEntityType: string;
  targetEntityId: string;
  linkType: LinkType;
  metadata?: Record<string, any>;
}

export interface IntegrationLinkPersistenceClient {
  integrationLink?: PrismaService['integrationLink'];
  integration_link?: PrismaService['integration_link'];
}

type IntegrationLinkRecord = {
  id: number | string;
  source_module?: string;
  source_entity_type?: string;
  source_entity_id?: string;
  target_module?: string;
  target_entity_type?: string;
  target_entity_id?: string;
  link_type?: LinkType | string;
  created_at?: Date;
  updated_at?: Date;
  sourceModule?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  targetModule?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  linkType?: LinkType | string;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class IntegrationLinkService {
  constructor(private readonly prisma: PrismaService) {}

  private resolvePersistence(
    persistenceClient?: IntegrationLinkPersistenceClient,
  ) {
    const client = (persistenceClient ?? this.prisma) as PrismaService &
      IntegrationLinkPersistenceClient;
    const delegate = client.integration_link ?? client.integrationLink;
    const useSnakeCase = !!client.integration_link;

    if (!delegate) {
      throw new Error(
        'Integration link delegate is not available on the Prisma client.',
      );
    }

    return { delegate, useSnakeCase };
  }

  private toDomainLink(record: IntegrationLinkRecord): IntegrationLink {
    return {
      id: String(record.id),
      sourceModule: record.source_module ?? record.sourceModule ?? '',
      sourceEntityType:
        record.source_entity_type ?? record.sourceEntityType ?? '',
      sourceEntityId: record.source_entity_id ?? record.sourceEntityId ?? '',
      targetModule: record.target_module ?? record.targetModule ?? '',
      targetEntityType:
        record.target_entity_type ?? record.targetEntityType ?? '',
      targetEntityId: record.target_entity_id ?? record.targetEntityId ?? '',
      linkType: (record.link_type ?? record.linkType ?? LinkType.REFERENCE) as LinkType,
      metadata: record.metadata ?? null,
      createdAt: record.created_at ?? record.createdAt ?? new Date(),
      updatedAt: record.updated_at ?? record.updatedAt ?? new Date(),
    };
  }

  private toDatabaseId(linkId: string | number) {
    if (typeof linkId === 'number') {
      return linkId;
    }

    const numericId = Number(linkId);
    return Number.isNaN(numericId) ? linkId : numericId;
  }

  /**
   * Create a link between entities from different modules
   */
  async createLink(
    dto: CreateIntegrationLinkDto,
    persistenceClient?: IntegrationLinkPersistenceClient,
  ): Promise<IntegrationLink> {
    const { delegate, useSnakeCase } = this.resolvePersistence(persistenceClient);

    const record = await delegate.create({
      data: useSnakeCase
        ? {
            source_module: dto.sourceModule,
            source_entity_type: dto.sourceEntityType,
            source_entity_id: dto.sourceEntityId,
            target_module: dto.targetModule,
            target_entity_type: dto.targetEntityType,
            target_entity_id: dto.targetEntityId,
            link_type: dto.linkType,
            metadata: dto.metadata || null,
          }
        : {
            sourceModule: dto.sourceModule,
            sourceEntityType: dto.sourceEntityType,
            sourceEntityId: dto.sourceEntityId,
            targetModule: dto.targetModule,
            targetEntityType: dto.targetEntityType,
            targetEntityId: dto.targetEntityId,
            linkType: dto.linkType,
            metadata: dto.metadata || null,
          },
    });

    return this.toDomainLink(record as IntegrationLinkRecord);
  }

  /**
   * Find all links originating from a source entity
   */
  async findOutbound(
    sourceModule: string,
    sourceEntityType: string,
    sourceEntityId: string,
  ): Promise<IntegrationLink[]> {
    const { delegate, useSnakeCase } = this.resolvePersistence();
    const records = await delegate.findMany({
      where: useSnakeCase
        ? {
            source_module: sourceModule,
            source_entity_type: sourceEntityType,
            source_entity_id: sourceEntityId,
          }
        : {
            sourceModule,
            sourceEntityType,
            sourceEntityId,
          },
    });

    return records.map((record: IntegrationLinkRecord) =>
      this.toDomainLink(record),
    );
  }

  /**
   * Find all links terminating at a target entity
   */
  async findInbound(
    targetModule: string,
    targetEntityType: string,
    targetEntityId: string,
  ): Promise<IntegrationLink[]> {
    const { delegate, useSnakeCase } = this.resolvePersistence();
    const records = await delegate.findMany({
      where: useSnakeCase
        ? {
            target_module: targetModule,
            target_entity_type: targetEntityType,
            target_entity_id: targetEntityId,
          }
        : {
            targetModule,
            targetEntityType,
            targetEntityId,
          },
    });

    return records.map((record: IntegrationLinkRecord) =>
      this.toDomainLink(record),
    );
  }

  /**
   * Find links of a specific type
   */
  async findByLinkType(linkType: LinkType): Promise<IntegrationLink[]> {
    const { delegate, useSnakeCase } = this.resolvePersistence();
    const records = await delegate.findMany({
      where: useSnakeCase ? { link_type: linkType } : { linkType },
    });

    return records.map((record: IntegrationLinkRecord) =>
      this.toDomainLink(record),
    );
  }

  /**
   * Delete a link
   */
  async deleteLink(linkId: string): Promise<IntegrationLink> {
    const { delegate } = this.resolvePersistence();
    const record = await delegate.delete({
      where: { id: this.toDatabaseId(linkId) },
    });

    return this.toDomainLink(record as IntegrationLinkRecord);
  }

  /**
   * Get link by ID
   */
  async getById(linkId: string): Promise<IntegrationLink | null> {
    const { delegate } = this.resolvePersistence();
    const record = await delegate.findUnique({
      where: { id: this.toDatabaseId(linkId) },
    });

    return record ? this.toDomainLink(record as IntegrationLinkRecord) : null;
  }

  /**
   * Find bidirectional link between two entities
   */
  async findBidirectional(
    module1: string,
    entity1Type: string,
    entity1Id: string,
    module2: string,
    entity2Type: string,
    entity2Id: string,
  ): Promise<IntegrationLink | null> {
    const { delegate, useSnakeCase } = this.resolvePersistence();

    const record = await delegate.findFirst({
      where: {
        OR: useSnakeCase
          ? [
              {
                source_module: module1,
                source_entity_type: entity1Type,
                source_entity_id: entity1Id,
                target_module: module2,
                target_entity_type: entity2Type,
                target_entity_id: entity2Id,
              },
              {
                source_module: module2,
                source_entity_type: entity2Type,
                source_entity_id: entity2Id,
                target_module: module1,
                target_entity_type: entity1Type,
                target_entity_id: entity1Id,
              },
            ]
          : [
              {
                sourceModule: module1,
                sourceEntityType: entity1Type,
                sourceEntityId: entity1Id,
                targetModule: module2,
                targetEntityType: entity2Type,
                targetEntityId: entity2Id,
              },
              {
                sourceModule: module2,
                sourceEntityType: entity2Type,
                sourceEntityId: entity2Id,
                targetModule: module1,
                targetEntityType: entity1Type,
                targetEntityId: entity1Id,
              },
            ],
      },
    });

    return record ? this.toDomainLink(record as IntegrationLinkRecord) : null;
  }

  /**
   * Count links from a module
   */
  async countFromModule(sourceModule: string): Promise<number> {
    const { delegate, useSnakeCase } = this.resolvePersistence();
    return delegate.count({
      where: useSnakeCase ? { source_module: sourceModule } : { sourceModule },
    });
  }
}
