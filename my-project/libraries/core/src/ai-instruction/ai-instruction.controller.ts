import { Role } from '@hed-hog/api';
import { Pagination } from '@hed-hog/api-pagination';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  forwardRef,
} from '@nestjs/common';
import { DeleteDTO } from '../dto/delete.dto';
import { AiInstructionService } from './ai-instruction.service';
import { CreateAiInstructionDTO } from './dto/create-ai-instruction.dto';
import { UpdateAiInstructionDTO } from './dto/update-ai-instruction.dto';

@Role()
@Controller('ai-instruction')
export class AiInstructionController {
  constructor(
    @Inject(forwardRef(() => AiInstructionService))
    private readonly aiInstructionService: AiInstructionService,
  ) {}

  @Get()
  async list(@Pagination() paginationParams) {
    return this.aiInstructionService.list(paginationParams);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.aiInstructionService.getById(id);
  }

  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.aiInstructionService.getBySlug(slug);
  }

  @Post()
  async create(@Body() dto: CreateAiInstructionDTO) {
    return this.aiInstructionService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAiInstructionDTO,
  ) {
    return this.aiInstructionService.update(id, dto);
  }

  @Delete()
  async delete(@Body() data: DeleteDTO) {
    return this.aiInstructionService.delete(data);
  }

  @Get(':id/versions')
  async listVersions(@Param('id', ParseIntPipe) id: number) {
    return this.aiInstructionService.listVersions(id);
  }

  @Post(':id/versions/:version/restore')
  async restoreVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.aiInstructionService.restoreVersion(id, version);
  }
}
