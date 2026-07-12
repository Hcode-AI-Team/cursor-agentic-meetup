import { Role, User } from '@hed-hog/api';
import { Pagination, PaginationDTO } from '@hed-hog/api-pagination';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { McpApiKeyService } from './mcp-api-key.service';

@Role()
@Controller('mcp/api-keys')
export class McpApiKeyController {
  constructor(private readonly mcpApiKeyService: McpApiKeyService) {}

  @Get()
  list(
    @Pagination() paginationParams: PaginationDTO,
    @User() { id }: { id: number },
  ) {
    return this.mcpApiKeyService.list(id, paginationParams);
  }

  @Post()
  create(
    @User() { id }: { id: number },
    @Body() body: { name: string; type?: 'mcp' | 'api' },
  ) {
    return this.mcpApiKeyService.create(id, body.name, body.type);
  }

  @Delete(':id')
  revoke(
    @User() { id: userId }: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.mcpApiKeyService.revoke(userId, id);
  }
}
