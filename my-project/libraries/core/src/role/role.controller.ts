import { Role } from '@hed-hog/api';
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
import { DeleteDTO } from '../dto/delete.dto';
import { UpdateIdsDTO } from '../dto/update-ids.dto';
import { CreateDTO } from './dto/create.dto';
import { UpdateDTO } from './dto/update.dto';
import { RoleService } from './role.service';

@Role()
@Controller('role')
export class RoleController {
  constructor(
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
  ) {}

  @Get()
  async list(@Pagination() paginationParams, @Locale() locale) {
    return this.roleService.list(paginationParams, locale);
  }

  @Get(':roleId/user')
  async listUsers(
    @Pagination() paginationParams,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.roleService.listUsers(roleId, paginationParams);
  }

  @Get(':roleId/menu')
  async listMenus(
    @Pagination() paginationParams,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Locale() locale,
  ) {
    return this.roleService.listMenus(locale, roleId, paginationParams);
  }

  @Get(':roleId/route')
  async listRoutes(
    @Pagination() paginationParams,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Query('search') search?: string,
    @Query('searchType') searchType?: 'contains' | 'startsWith' | 'endsWith',
    @Query('method') method?: string,
  ) {
    return this.roleService.listRoutes(roleId, paginationParams, search, searchType, method);
  }

  @Get(':roleId/screen')
  async listScreens(
    @Pagination() paginationParams,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Locale() locale,
  ) {
    return this.roleService.listScreens(locale, roleId, paginationParams);
  }

  @Patch(':roleId/user')
  async updateUsers(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() data: UpdateIdsDTO,
  ) {
    return this.roleService.updateUsers(roleId, data);
  }

  @Patch(':roleId/menu')
  async updateMenus(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() data: UpdateIdsDTO,
  ) {
    return this.roleService.updateMenus(roleId, data);
  }

  @Patch(':roleId/route')
  async updateRoutes(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() data: UpdateIdsDTO,
  ) {
    return this.roleService.updateRoutes(roleId, data);
  }

  @Patch(':roleId/screen')
  async updateScreens(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() data: UpdateIdsDTO,
  ) {
    return this.roleService.updateScreens(roleId, data);
  }

  @Get(':roleId')
  async show(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.roleService.get(roleId);
  }

  @Post()
  async create(@Body() data: CreateDTO) {
    return this.roleService.create(data);
  }

  @Patch(':roleId')
  async update(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() data: UpdateDTO,
    @Locale() locale,
  ) {
    return this.roleService.update(roleId, data, locale);
  }

  @Delete()
  async delete(@Body() data: DeleteDTO, @Locale() locale) {
    return this.roleService.delete(data, locale);
  }
}
