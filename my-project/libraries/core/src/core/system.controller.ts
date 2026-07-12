import { Role } from '@hed-hog/api';
import { Controller, forwardRef, Get, Inject } from '@nestjs/common';
import { SystemService } from './system.service';
@Role()
@Controller('system')
export class SystemController {
  constructor(
    @Inject(forwardRef(() => SystemService))
    private readonly service: SystemService,
  ) {}

  @Get()
  async index() {
    return this.service.index();
  }
}
