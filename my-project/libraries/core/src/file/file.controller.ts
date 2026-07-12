import { Public, Role } from '@hed-hog/api';
import { getLocaleText, Locale } from '@hed-hog/api-locale';
import { Pagination } from '@hed-hog/api-pagination';
import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { readFileSync } from 'fs';
import Handlebars from 'handlebars';
import { join } from 'path';
import { DeleteDTO } from './dto/delete.dto';
import { UploadFileDTO } from './dto/upload.dto';
import { FileService } from './file.service';

@Role()
@Controller('file')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(
    @Inject(forwardRef(() => FileService))
    private readonly fileService: FileService,
  ) {}

  private renderDownloadErrorHtml(locale: string, error: any): string {
    const errorTitle = getLocaleText('file.download.error_title', locale);
    const errorMessage = getLocaleText('file.download.error_message', locale);
    const errorDetailsLabel = getLocaleText('file.download.error_details', locale);
    const goBackText = getLocaleText('file.download.go_back', locale);

    const templateData = {
      locale: locale || 'en',
      errorTitle,
      errorMessage,
      errorDetailsLabel,
      errorDetails: error?.message || 'Unknown error occurred',
      goBackText,
    };

    try {
      const templatePath = join(__dirname, 'templates', 'download-error.html');
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);
      return template(templateData);
    } catch (templateError) {
      this.logger.warn(
        `Download error template missing or unreadable: ${templateError instanceof Error ? templateError.message : String(templateError)}`,
      );

      const safe = {
        errorTitle: Handlebars.escapeExpression(String(errorTitle)),
        errorMessage: Handlebars.escapeExpression(String(errorMessage)),
        errorDetailsLabel: Handlebars.escapeExpression(String(errorDetailsLabel)),
        errorDetails: Handlebars.escapeExpression(String(templateData.errorDetails)),
        goBackText: Handlebars.escapeExpression(String(goBackText)),
      };

      return `<!doctype html><html lang="${Handlebars.escapeExpression(locale || 'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safe.errorTitle}</title></head><body><h1>${safe.errorTitle}</h1><p>${safe.errorMessage}</p><p><strong>${safe.errorDetailsLabel}</strong> ${safe.errorDetails}</p><button type="button" onclick="history.back()">${safe.goBackText}</button></body></html>`;
    }
  }

  @Get()
  async list(@Pagination() paginationParams) {
    return this.fileService.getFiles(paginationParams);
  }

  @Get(':id')
  async show(@Param('id', ParseIntPipe) id) {
    return this.fileService.get(id);
  }

  @Put('open/:id')
  async getTempOpenURL(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const file = await this.fileService.get(id);
    const token = this.fileService.createDownloadToken(file.path, 3600);
    const origin = `${req.protocol}://${req.get('host')}`;

    return {
      url: `${origin}/file/open/${encodeURIComponent(token)}`,
    };
  }

  @Put('download/:id')
    async getTempURL(
      @Param('id', ParseIntPipe) id: number,
      @Req() req: Request,
    ) {
      const file = await this.fileService.get(id);
      const token = this.fileService.createDownloadToken(file.path, 3600);
      const origin = `${req.protocol}://${req.get('host')}`;

    return {
        url: `${origin}/file/download/${encodeURIComponent(token)}`,
    };
  }

  @Public()
  @Get('download/:token')
  async download(
    @Param('token') token: string,
    @Res() res: Response,
    @Locale() locale: string,
  ) {

    try {

      const { stream, filename, mimetype, size } =
        await this.fileService.download(locale, token);

      const encodedFilename = encodeURIComponent(filename);
      res.set({
        'Content-Type': mimetype || 'application/octet-stream',
        'Content-Disposition':
          `attachment; filename="${filename}"; ` +
          `filename*=UTF-8''${encodedFilename}`,
      });

      if (typeof size === 'number') {
        res.set('Content-Length', `${size}`);
      }

      stream.pipe(res);
      return;

    } catch (error:any) {
      const html = this.renderDownloadErrorHtml(locale, error);
      res.status(400).set('Content-Type', 'text/html').send(html);
      return;
    }
  }

  @Public()
  @Get('image/:id')
  async openImage(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
    @Locale() locale: string,
  ) {
    try {
      await this.fileService.serveImageById(
        locale,
        id,
        req.headers['if-none-match'],
        res,
      );
    } catch (error: any) {
      const html = this.renderDownloadErrorHtml(locale, error);
      res.status(400).set('Content-Type', 'text/html').send(html);
    }
  }

  @Public()
  @Get('open/:token')
  async open(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
    @Locale() locale: string,
  ) {

    try {

      const numericId = Number(token);
      const isNumericId = Number.isInteger(numericId) && String(numericId) === token;

      if (isNumericId && numericId > 0) {
        await this.fileService.serveFileById(
          locale,
          numericId,
          req.headers['if-none-match'],
          res,
        );
        return;
      }

      const { stream, filename, mimetype, size } =
        await this.fileService.download(locale, token);

      const encodedFilename = encodeURIComponent(filename);

      res.set({
        'Content-Type': mimetype || 'application/octet-stream',
        'Content-Disposition':
          `inline; filename="${filename}"; ` +
          `filename*=UTF-8''${encodedFilename}`,
      });

      if (typeof size === 'number') {
        res.set('Content-Length', `${size}`);
      }

      stream.pipe(res);
      return;

    } catch (error:any) {
      const html = this.renderDownloadErrorHtml(locale, error);

      res.status(400).set('Content-Type', 'text/html').send(html);
      return;
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: MulterFile,
    @Body() body: UploadFileDTO,
  ) {
    const destination = body.destination || 'files';
    const maxWidth = Number(body.maxWidth) || undefined;
    const maxHeight = Number(body.maxHeight) || undefined;
    return this.fileService.upload(destination, file, { maxWidth, maxHeight });
  }

  @Delete()
  async delete(@Body() data: DeleteDTO, @Locale() locale: string) {
    return this.fileService.delete(locale, data);
  }
}
