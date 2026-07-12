import { DeleteDTO, Role } from '@hed-hog/api';
import { Pagination } from '@hed-hog/api-pagination';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CreateDTO } from './dto/create.dto';
import { ExportDTO } from './dto/export.dto';
import { ImportConfirmDTO } from './dto/import-confirm.dto';
import { UpdateDTO } from './dto/update.dto';
import { IntegrationProfileService } from './integration-profile.service';

@Role()
@Controller('integration-profile')
export class IntegrationProfileController {
  constructor(
    @Inject(forwardRef(() => IntegrationProfileService))
    private readonly integrationProfileService: IntegrationProfileService,
  ) {}

  @Get('types')
  async listTypes() {
    return this.integrationProfileService.listTypes();
  }

  @Get('providers')
  async listProviders(
    @Query('typeId') typeId?: string,
    @Query('typeSlug') typeSlug?: string,
  ) {
    return this.integrationProfileService.listProviders(
      typeId ? parseInt(typeId, 10) : undefined,
      typeSlug,
    );
  }

  @Get()
  async list(
    @Pagination() paginationParams,
    @Query('typeId') typeId?: string,
    @Query('typeSlug') typeSlug?: string,
    @Query('providerSlug') providerSlug?: string,
    @Query('slug') slug?: string,
  ) {
    return this.integrationProfileService.list(
      paginationParams,
      typeId ? parseInt(typeId, 10) : undefined,
      typeSlug,
      providerSlug,
      slug,
    );
  }

  @Get('export')
  @Header('Content-Type', 'application/octet-stream')
  @Header(
    'Content-Disposition',
    'attachment; filename="integration-profiles.hedhog"',
  )
  async export(
    @Query() { ids, include_secrets = false }: ExportDTO,
    @Res() res: Response,
  ) {
    const parsedIds = String(ids ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const file = await this.integrationProfileService.exportProfiles({
      ids: parsedIds.length > 0 ? parsedIds : undefined,
      includeSecrets: include_secrets,
    });

    res.send(file);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.integrationProfileService.get(id);
  }

  @Post()
  async create(@Body() data: CreateDTO) {
    return this.integrationProfileService.create(data);
  }

  @Post('test')
  async test(@Body() data: CreateDTO) {
    return this.integrationProfileService.test(data);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDTO,
  ) {
    return this.integrationProfileService.update({ id, data });
  }

  @Delete()
  async delete(@Body() data: DeleteDTO) {
    return this.integrationProfileService.delete(data);
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post('import/validate')
  async validateImport(@UploadedFile() file: MulterFile) {
    return this.integrationProfileService.validateImportFile(file);
  }

  @Post('import/confirm')
  async confirmImport(@Body() data: ImportConfirmDTO) {
    return this.integrationProfileService.confirmImport({
      profiles: data.profiles,
      conflictResolutions: data.conflict_resolutions,
    });
  }
}
