import { DeleteDTO, Public, Role } from '@hed-hog/api';
import { Pagination } from '@hed-hog/api-pagination';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookIntegrationService } from './webhook-integration.service';
import {
  CreateWebhookActionDTO,
  UpdateWebhookActionDTO,
} from './dto/webhook-action.dto';

@Role()
@Controller('webhook-integration')
export class WebhookIntegrationController {
  constructor(private readonly service: WebhookIntegrationService) {}

  @Get()
  list(@Pagination() paginationParams) {
    return this.service.list(paginationParams);
  }

  @Get('user-tokens')
  listUserTokens(@Query('userId', ParseIntPipe) userId: number) {
    return this.service.listUserApiTokens(userId);
  }

  @Post('user-tokens')
  createUserToken(@Body() data: { userId: number; name: string }) {
    return this.service.createUserApiToken(data.userId, data.name);
  }

  @Get('internal-routes')
  listInternalRoutes() {
    return this.service.listInternalRoutes();
  }

  @Get('app-commands')
  listAppCommands() {
    return this.service.listAppCommands();
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

  @Post(':id/regenerate-uuid')
  regenerateUuid(@Param('id', ParseIntPipe) id: number) {
    return this.service.regenerateUuid(id);
  }

  @Post(':id/regenerate-token')
  regenerateToken(@Param('id', ParseIntPipe) id: number) {
    return this.service.regenerateToken(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.service.duplicate(id);
  }

  @Get(':id/action')
  listActions(@Param('id', ParseIntPipe) id: number) {
    return this.service.listActions(id);
  }

  @Post(':id/action')
  createAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: CreateWebhookActionDTO,
  ) {
    return this.service.createAction(id, data);
  }

  @Patch(':id/action/:actionId')
  updateAction(
    @Param('id', ParseIntPipe) id: number,
    @Param('actionId', ParseIntPipe) actionId: number,
    @Body() data: UpdateWebhookActionDTO,
  ) {
    return this.service.updateAction(id, actionId, data);
  }

  @Delete(':id/action')
  deleteActions(@Param('id', ParseIntPipe) id: number, @Body() data: DeleteDTO) {
    return this.service.deleteActions(id, data);
  }

  @Get(':id/log')
  listLogs(
    @Param('id', ParseIntPipe) id: number,
    @Pagination() paginationParams,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.service.listLogs(id, paginationParams, sort);
  }

  @Get(':id/log/stream')
  streamLogs(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    return this.service.streamLogs(id, res);
  }

  @Post(':id/log/:logId/retry')
  retryLog(
    @Param('id', ParseIntPipe) id: number,
    @Param('logId', ParseIntPipe) logId: number,
  ) {
    return this.service.retryCall(id, logId);
  }
}

@Public()
@Controller('webhook')
export class PublicWebhookController {
  constructor(private readonly service: WebhookIntegrationService) {}

  @Post(':uuid')
  execute(
    @Param('uuid') uuid: string,
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: Request,
  ) {
    return this.service.executePublic(uuid, body, headers, req);
  }

  /**
   * GET variant so a webhook can be triggered by a plain clickable link (e.g.
   * approve/reject links sent by email/WhatsApp). Query params are used as the
   * payload for action templates (`{{body.decision}}` ← `?decision=approve`).
   */
  @Get(':uuid')
  executeGet(
    @Param('uuid') uuid: string,
    @Query() query: any,
    @Headers() headers: any,
    @Req() req: Request,
  ) {
    return this.service.executePublic(uuid, query ?? {}, headers, req);
  }
}

