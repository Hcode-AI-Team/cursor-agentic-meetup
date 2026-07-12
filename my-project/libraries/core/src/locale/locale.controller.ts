import { Role } from '@hed-hog/api';
import { Pagination, PaginationDTO } from '@hed-hog/api-pagination';
import {
    Body,
    Controller,
    Get,
    Inject,
    Post,
    Query,
    forwardRef,
} from '@nestjs/common';
import { CreateLocaleDTO } from './dto/create-locale.dto';
import { LocaleService } from './locale.service';

@Role()
@Controller('core/locales')
export class LocaleController {
  constructor(
    @Inject(forwardRef(() => LocaleService))
    private readonly localeService: LocaleService,
  ) {}

  @Get()
  async findAll(
    @Pagination() paginationDto: PaginationDTO,
    @Query('search') search?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.localeService.findAll(paginationDto, search, enabled);
  }

  @Post()
  async create(@Body() dto: CreateLocaleDTO) {
    return this.localeService.create(dto);
  }
}