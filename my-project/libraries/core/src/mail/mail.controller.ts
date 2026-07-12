import { DeleteDTO, Role } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { renderMailTemplate } from '@hed-hog/api-mail';
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
    forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import { CreateDTO } from './dto/create.dto';
import { ImportDTO } from './dto/import.dto';
import { TestMailDTO } from './dto/test-mail.dto';
import { UpdateDTO } from './dto/update.dto';
import { MailService } from './mail.service';

@Role()
@Controller('mail')
export class MailController {
  constructor(
    @Inject(forwardRef(() => MailService))
    private readonly mailService: MailService,
  ) {}

  @Get()
  async list(@Locale() locale, @Pagination() paginationParams) {
    return this.mailService.list(locale, paginationParams);
  }

  @Get(':id')
  async get(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') queryLocale?: string,
    @Locale() decoratorLocale?: string,
  ) {
    const locale = queryLocale || decoratorLocale;
    return this.mailService.get(locale, id);
  }

  @Get(':id/html')
  @Header('Content-Type', 'text/html')
  async getHtml(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Query('locale') queryLocale?: string,
    @Locale() decoratorLocale?: string,
  ) {
    const locale = queryLocale || decoratorLocale;
    const mail = await this.mailService.get(locale, id);
    const html = renderMailTemplate({
      subject: mail.subject,
      body: mail.body,
    });

    res.setHeader('Content-Disposition', `attachment; filename="${mail.slug}-${locale}.html"`);
    res.send(html);
  }

  @Post()
  async create(@Body() data: CreateDTO) {
    return this.mailService.create(data);
  }

  @Post('reload')
  async reloadConfig() {
    return this.mailService.reloadConfig();
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateDTO) {
    return this.mailService.update({
      id,
      data,
    });
  }

  @Delete()
  async delete(@Body() data: DeleteDTO) {
    return this.mailService.delete(data);
  }

  @Post('test')
  async sendTestMail(@Locale() locale: string, @Body() data: TestMailDTO) {
    return this.mailService.sendTestMail(locale, data);
  }

  @Post('import')
  async import(@Body() data: ImportDTO) {
    return this.mailService.importTemplates(data);
  }
}
