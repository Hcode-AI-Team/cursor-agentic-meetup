import { DeleteDTO } from '@hed-hog/api';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class IntegrationEventCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
  ) {}

  private get delegate() {
    return (this.prisma as any).integration_event_catalog;
  }

  async list(paginationParams: PaginationDTO) {
    const fields = ['slug', 'name', 'module', 'description', 'status'];
    const OR = this.prisma.createInsensitiveSearch(fields, paginationParams);

    return this.pagination.paginate(this.delegate, paginationParams, {
      where: OR.length > 0 ? { OR } : {},
      orderBy: [{ module: 'asc' }, { slug: 'asc' }],
    });
  }

  async options() {
    return this.delegate.findMany({
      where: { status: 'active' },
      orderBy: [{ module: 'asc' }, { slug: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        module: true,
        description: true,
      },
    });
  }

  async get(id: number) {
    const record = await this.delegate.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Event catalog item with id ${id} not found.`);
    }
    return record;
  }

  async create(data: any) {
    await this.ensureSlugAvailable(data.slug);
    return this.delegate.create({
      data: this.normalize(data),
    });
  }

  async update(id: number, data: any) {
    const existing = await this.get(id);
    if (data.slug && data.slug !== existing.slug) {
      await this.ensureSlugAvailable(data.slug);
    }

    return this.delegate.update({
      where: { id },
      data: this.normalize(data, true),
    });
  }

  async delete(data: DeleteDTO) {
    if (!data.ids?.length) {
      throw new BadRequestException('You must select at least one item to delete.');
    }

    return this.delegate.deleteMany({
      where: { id: { in: data.ids } },
    });
  }

  private async ensureSlugAvailable(slug: string) {
    const existing = await this.delegate.findUnique({
      where: { slug: String(slug || '').trim() },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(`Event "${slug}" already exists.`);
    }
  }

  private normalize(data: any, partial = false) {
    const normalized: Record<string, any> = {};
    const assign = (key: string, value: any) => {
      if (!partial || value !== undefined) {
        normalized[key] = value;
      }
    };

    assign('slug', String(data.slug ?? '').trim());
    assign('name', String(data.name ?? '').trim());
    assign('module', String(data.module ?? '').trim());
    assign(
      'description',
      data.description === undefined || data.description === null
        ? partial
          ? undefined
          : null
        : String(data.description).trim() || null,
    );
    assign('status', data.status === 'inactive' ? 'inactive' : 'active');

    return normalized;
  }
}

