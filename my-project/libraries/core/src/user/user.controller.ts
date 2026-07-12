import { NoRole, Public, Role, User } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { Pagination } from '@hed-hog/api-pagination';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { DeleteDTO } from '../dto/delete.dto';
import { CreateWithEmailAndPasswordDTO } from './dto/create-with-email-and-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { UpdateDTO } from './dto/update.dto';
import { UserService } from './user.service';

@Role()
@Controller('user')
export class UserController {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) { }

  @Get()
  async list(@Pagination() paginationParams) {
    return this.userService.list(paginationParams);
  }

  @Get(':userId')
  async get(@Param('userId', ParseIntPipe) userId: number, @Locale() locale: string) {
    return this.userService.get(locale, userId);
  }

  @Public()
  @Get('avatar/:fileId')
  async openPublicAvatar(
    @Param('fileId', ParseIntPipe) fileId: number,
    @Locale() locale: string,
    @Req() req: Request,
    @Res() res,
  ) {
    return this.userService.openPublicAvatar(locale, fileId, req.headers['if-none-match'] as string | undefined, res);
  }

  @Post()
  async create(@Body() data: CreateWithEmailAndPasswordDTO, @Locale() locale: string) {
    return this.userService.createWithEmailAndPassword(locale, data);
  }

  @Patch(':userId')
  async update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() data: UpdateDTO,
    @Locale() locale: string,
    @User() actor,
  ) {
    return this.userService.update(locale, userId, data, actor?.id);
  }

  @Patch(':userId/reset-password')
  async resetPassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() data: ResetPasswordDTO,
    @Locale() locale: string,
    @User() actor,
  ) {
    return this.userService.resetPassword(locale, userId, data, actor?.id);
  }

  @UseInterceptors(
    FileInterceptor('avatar', {
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Arquivo inválido'), false);
        }
        cb(null, true);
      },
    }),
  )
  @Post(':userId/avatar')
  async changeAvatar(
    @Locale() locale: string,
    @Param('userId', ParseIntPipe) userId: number,
    @UploadedFile() avatar: MulterFile,
    @User() actor,
  ) {
    return this.userService.changeAvatar(locale, userId, avatar, actor?.id)
  }

  @Post(':userId/verify-identifier/:identifierId')
  async verifyIdentifier(
    @Locale() locale: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('identifierId', ParseIntPipe) identifierId: number,
  ) {
    return this.userService.verifyIdentifier(locale, userId, identifierId);
  }

  @Delete()
  async delete(@Body() data: DeleteDTO, @Locale() locale: string) {
    return this.userService.delete(locale, data);
  }

  @Get(':userId/role')
    async getUserRoles(
      @Param('userId', ParseIntPipe) userId: number,
      @Locale() locale: string,
    ) {
      return this.userService.getUserRoles(locale, userId);
  }

  @Get(':userId/menu')
  async getUserMenus(
    @Param('userId', ParseIntPipe) userId: number,
    @Locale() locale: string,
  ) {
    return this.userService.getUserMenus(locale, userId);
  }

  @Get(':userId/route')
  async getUserRoutes(@Param('userId', ParseIntPipe) userId: number, @Locale() locale: string) {
    return this.userService.getUserRoutes(locale, userId);
  }

  @NoRole()
  @Get('me/activity')
  async listMyActivities(
    @User() { id }: { id: number },
    @Pagination() paginationParams,
    @Locale() locale: string,
  ) {
    return this.userService.listUserActivities(locale, id, paginationParams);
  }

  @Get(':userId/log')
  async listLogs(
    @Param('userId', ParseIntPipe) userId: number,
    @Pagination() paginationParams,
    @Locale() locale: string,
  ) {
    return this.userService.listUserChangeLogs(locale, userId, paginationParams);
  }

  @Post(':userId/role/:roleId')
  async assignRoleToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Locale() locale: string,
    @User() actor,
  ) {
    return this.userService.assignRoleToUser(locale, userId, roleId, actor?.id);
  }

  @Delete(':userId/role/:roleId')
  async removeRoleFromUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Locale() locale: string,
    @User() actor,
  ) {
    return this.userService.removeRoleFromUser(locale, userId, roleId, actor?.id);
  }
}
