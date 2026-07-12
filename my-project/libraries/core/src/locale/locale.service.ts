import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CreateLocaleDTO } from './dto/create-locale.dto';

@Injectable()
export class LocaleService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(paginationDto: PaginationDTO, search?: string, enabled?: string) {
    const normalizedSearch = search ?? paginationDto.search;
    const paginationParams: PaginationDTO = {
      ...paginationDto,
      search: normalizedSearch,
    };
    const fields = ['name', 'code'];
    const OR: any[] = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    const where: Record<string, any> = { OR };
    if (enabled !== undefined) {
      where.enabled = enabled === 'true';
    }

    return this.paginationService.paginate(
      this.prismaService.locale,
      paginationParams,
      { where },
    );
  }

  async create(dto: CreateLocaleDTO) {
    return this.prismaService.locale.create({
      data: {
        name: dto.name,
        code: dto.code,
        region: dto.region ?? null,
        enabled: dto.enabled ?? true,
      },
    });
  }
}