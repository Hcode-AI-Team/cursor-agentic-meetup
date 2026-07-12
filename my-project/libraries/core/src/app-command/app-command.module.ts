import { Global, Module } from '@nestjs/common';
import { AppCommandRegistry } from './app-command.registry';

@Global()
@Module({
  providers: [AppCommandRegistry],
  exports: [AppCommandRegistry],
})
export class AppCommandModule {}
