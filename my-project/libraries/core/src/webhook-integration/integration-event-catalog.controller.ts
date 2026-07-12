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
import { IntegrationEventCatalogService } from './integration-event-catalog.service';

@Role()
@Controller('integration-event-catalog')
export class IntegrationEventCatalogController {
  constructor(private readonly service: IntegrationEventCatalogService) {}

  @Get()
  list(@Pagination() paginationParams) {
    return this.service.list(paginationParams);
  }

  @Get('options')
  options() {
    return this.service.options();
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
}

