import { Role, User } from '@hed-hog/api';
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
    forwardRef,
} from '@nestjs/common';
import { DeleteDTO } from '../dto/delete.dto';
import { UpdateIdsDTO } from '../dto/update-ids.dto';
import { CreateDTO } from './dto/create.dto';
import { OrderDTO } from './dto/order.dto';
import { UpdateDTO } from './dto/update.dto';
import { MenuService } from './menu.service';

@Role()
@Controller('menu')
export class MenuController {
  constructor(
    @Inject(forwardRef(() => MenuService))
    private readonly menuService: MenuService,
  ) {}

  @Get('system')
  async getSystemMenu(@User() { id }, @Locale() locale) {
    return this.menuService.getSystemMenu(locale, id);
  }

  @Get('stats')
  async stats() {
    return this.menuService.stats();
  }

  @Get('all')
  async listAll(@Locale() locale) {
    return this.menuService.listAll(locale);
  }

  @Get()
  async list(@Pagination() paginationParams, @Locale() locale) {
    return this.menuService.list(locale, paginationParams);
  }

  @Get(':menuId/role')
  async listRoles(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Pagination() paginationParams,
    @Locale() locale,
  ) {
    return this.menuService.listRoles(locale, menuId, paginationParams);
  }

  @Patch(':menuId/role')
  async updateRoles(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Body() data: UpdateIdsDTO,
    @Locale() locale,
  ) {
    return this.menuService.updateRoles(locale, menuId, data);
  }

  @Get(':menuId')
  async show(@Locale() locale,@Param('menuId', ParseIntPipe) menuId: number) {
    return this.menuService.get(locale, menuId);
  }

  @Post()
  async create(@Locale() locale, @Body() data: CreateDTO) {
    return this.menuService.create(locale,data);
  }

  @Patch('order')
  async updateOrder(@Locale() locale, @Body() data: OrderDTO): Promise<void> {
    return this.menuService.updateOrder(locale, data);
  }

  @Patch(':menuId')
  async update(
    @Locale() locale,
    @Param('menuId', ParseIntPipe) menuId: number,
    @Body() data: UpdateDTO,
  ) {
    return this.menuService.update(locale,{
      id: menuId,
      data,
    });
  }

  @Delete()
  async delete(@Locale() locale, @Body() data: DeleteDTO) {
    return this.menuService.delete(locale, data);
  }
}
