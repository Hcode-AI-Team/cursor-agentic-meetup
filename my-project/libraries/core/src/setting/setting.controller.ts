import { Public, Role, User } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { Pagination } from '@hed-hog/api-pagination';
import {
    Body,
    Controller,
    Delete,
    forwardRef,
    Get,
    Header,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Res,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ConfirmImportDTO } from './dto/confirm-import.dto';
import { CreateDTO } from './dto/create.dto';
import { DeleteDTO } from './dto/delete.dto';
import { ExportDto } from './dto/export.dto';
import { SettingUserDTO } from './dto/setting-user.dto';
import { SettingDTO } from './dto/setting.dto';
import { UpdateSettingListDTO } from './dto/update-setting-list.dto';
import { UpdateDTO } from './dto/update.dto';
import { SettingService } from './setting.service';

@Role()
@Controller('setting')
export class SettingsController {
  constructor(
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
  ) { }

  @Get('export')
  @Header('Content-Type', 'application/octet-stream')
  @Header('Content-Disposition', 'attachment; filename="settings.hedhog"')
  async exportSettings(@Query() {secrets = false}: ExportDto, @Res() res: Response) {
    const compressedData = await this.settingService.exportSettings(secrets);
    res.send(compressedData);
  }

  @Public()
  @Get('initial')
  async initialSettings() {
    return this.settingService.getSystemSettings();
  }

  @Get('group/:slug')
  async getSettingFromGroup(
    @Pagination() paginationParams,
    @Locale() locale,
    @Param('slug') slug: string,
    @User() { id: userId },
  ) {
    return this.settingService.getSettingFromGroup(
      locale,
      paginationParams,
      slug,
      userId,
    );
  }

  @Public()
  @Get('group')
  async listSettingGroups(@Pagination() paginationParams, @Locale() locale) {
    return this.settingService.listSettingGroups(locale, paginationParams);
  }

  @Get('/user')
  async getUserSettings(@User() { id }) {
    return this.settingService.getUserSettings(id);
  }

  @Get('/effective')
  async getEffectiveSettings(@User() { id }) {
    return this.settingService.getEffectiveSettings(id);
  }

  @Get()
  async listSettings(@Pagination() paginationParams, @Locale() locale) {
    return this.settingService.listSettings(locale, paginationParams);
  }

  @Get(':settingId')
  async get(@Param('settingId', ParseIntPipe) settingId: number) {
    return this.settingService.get(settingId);
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post('import')
  async importSettings(@Locale() locale: string, @UploadedFile() file: MulterFile) {
    return this.settingService.importSettings(locale, file);
  }

  @Post('import/confirm')
  async confirmImport(@Body() data: ConfirmImportDTO) {
    return this.settingService.confirmImport(data.settings);
  }

  @Post()
  async create(@Locale() locale: string, @Body() data: CreateDTO) {
    return this.settingService.create(data, locale);
  }

  @Put('user/:slug')
  async updateUserFromSlug(
    @Param('slug') slug: string,
    @Body() { value }: SettingUserDTO,
    @User() { id },
    @Locale() locale,
  ) {
    return this.settingService.setSettingUserValue(locale, id, slug, value);
  }

  @Put(':slug')
  async updateFromSlug(@Param('slug') slug: string, @Body() data: UpdateDTO) {
    return this.settingService.updateFromSlug(slug, data);
  }

  @Put(':settingId/options')
  async updateSettingListOptions(
    @Param('settingId', ParseIntPipe) settingId: number,
    @Body() data: UpdateSettingListDTO,
  ) {
    return this.settingService.updateSettingListOptions(settingId, data);
  }

  @Put()
  async setManySettings(@Body() data: SettingDTO) {
    return this.settingService.setManySettings(data);
  }

  @Patch(':settingId')
  async update(
    @Param('settingId', ParseIntPipe) settingId: number,
    @Body() data: UpdateDTO,
  ) {
    return this.settingService.update({
      id: settingId,
      data,
    });
  }

  @Delete()
  async delete(@Locale() locale: string, @Body() data: DeleteDTO) {
    return this.settingService.delete(locale, data);
  }
}
