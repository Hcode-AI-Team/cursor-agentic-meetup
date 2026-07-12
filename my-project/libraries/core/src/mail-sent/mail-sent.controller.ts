import { DeleteDTO, Role } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
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
  Query,
  forwardRef,
} from '@nestjs/common';
import { CreateDTO } from './dto/create.dto';
import { QueryMailSentListDTO } from './dto/query-mail-sent-list.dto';
import { UpdateDTO } from './dto/update.dto';
import { MailSentService } from './mail-sent.service';

@Role()
@Controller('mail-sent')
export class MailSentController {
  constructor(
    @Inject(forwardRef(() => MailSentService))
    private readonly mailSentService: MailSentService,
  ) {}

  @Get()
  async list(
    @Pagination() paginationParams,
    @Query() query: QueryMailSentListDTO,
  ) {
    return this.mailSentService.list({
      ...paginationParams,
      status: query.status,
      hasError: query.hasError,
      recipientEmail: query.recipientEmail,
      createdAtFrom: query.createdAtFrom,
      createdAtTo: query.createdAtTo,
    });
  }

  @Get(':id')
  async get(
    @Param('id', ParseIntPipe) id: number,
    @Locale() locale: string
  ) {
    return this.mailSentService.get(locale, id);
  }

  @Post()
  async create(@Body() data: CreateDTO) {
    return this.mailSentService.create(data);
  }

  @Patch(':id')
  async update(@Locale() locale: string,@Param('id', ParseIntPipe) id: number, @Body() data: UpdateDTO) {
    return this.mailSentService.update(locale,{
      id,
      data,
    });
  }

  @Delete()
  async delete(@Locale() locale: string,@Body() data: DeleteDTO) {
    return this.mailSentService.delete(locale, data);
  }
}
