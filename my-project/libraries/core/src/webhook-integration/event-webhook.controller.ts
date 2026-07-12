import { DeleteDTO, Role } from '@hed-hog/api';
import { Pagination } from '@hed-hog/api-pagination';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { EventWebhookService } from './event-webhook.service';

@Role()
@Controller('event-webhook')
export class EventWebhookController {
  constructor(private readonly service: EventWebhookService) {}

  @Get()
  list(@Pagination() paginationParams) {
    return this.service.list(paginationParams);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.service.create(data);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Delete()
  delete(@Body() data: DeleteDTO) {
    return this.service.delete(data);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.service.duplicate(id);
  }

  @Get(':id/log')
  logs(@Param('id', ParseIntPipe) id: number, @Pagination() paginationParams) {
    return this.service.listLogs(id, paginationParams);
  }
}

