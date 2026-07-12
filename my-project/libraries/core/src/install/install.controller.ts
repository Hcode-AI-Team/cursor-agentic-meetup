import { Public } from '@hed-hog/api';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { GenerateMailMigrationDTO } from './dto/generate-migration.dto';
import { InstallDTO } from './dto/install.dto';
import { InstallService } from './install.service';

@Public()
@Controller('install')
export class InstallController {
  constructor(private readonly service: InstallService) { }

  @Post()
  install(@Body() data: InstallDTO) {
    return this.service.install(data);
  }

  @Get()
  check() {
    return this.service.check();
  }

  @Post('generate-mail-migration')
  generateMailMigration(@Body() data: GenerateMailMigrationDTO) {
    return this.service.generateMailMigration(data);
  }
}
