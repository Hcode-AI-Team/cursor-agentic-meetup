import { Role, User } from '@hed-hog/api';
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
    Req,
    Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { NotificationService } from './notification.service';

@Role()
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(@User() { id }, @Pagination() paginationParams) {
    return this.notificationService.list(id, paginationParams);
  }

  @Get('stream')
  async stream(
    @User() { id },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.notificationService.stream(id, req, res);
  }

  @Get('unread-count')
  async unreadCount(@User() { id }) {
    return this.notificationService.unreadCount(id);
  }

  @Patch('read-all')
  async markAllRead(@User() { id }) {
    return this.notificationService.markAllRead(id);
  }

  @Patch(':id/read')
  async markRead(
    @User() { id: userId },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.markRead(userId, id);
  }

  @Patch(':id/progress')
  async updateProgress(
    @User() { id: userId },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.notificationService.updateProgress(userId, id, dto);
  }

  @Delete()
  async deleteAll(@User() { id }) {
    return this.notificationService.deleteAll(id);
  }

  @Delete(':id')
  async delete(
    @User() { id: userId },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.delete(userId, id);
  }

  @Post()
  async create(@Body() data: CreateNotificationDto) {
    return this.notificationService.create(data);
  }
}
