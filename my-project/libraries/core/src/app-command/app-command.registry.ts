import { Injectable } from '@nestjs/common';

export interface AppCommandContext extends Record<string, unknown> {
  webhookBody?: unknown;
  webhookHeaders?: Record<string, unknown>;
  remoteIp?: string | null;
  publicUuid?: string;
  integrationId?: number;
}

export interface AppCommand {
  slug: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (
    params: Record<string, unknown>,
    context?: AppCommandContext,
  ) => Promise<unknown>;
}

@Injectable()
export class AppCommandRegistry {
  private readonly commands = new Map<string, AppCommand>();

  register(command: AppCommand): void {
    this.commands.set(command.slug, command);
  }

  find(slug: string): AppCommand | undefined {
    return this.commands.get(slug);
  }

  list(): AppCommand[] {
    return Array.from(this.commands.values());
  }

  async dispatch(
    slug: string,
    params: Record<string, unknown>,
    context?: AppCommandContext,
  ): Promise<unknown> {
    const command = this.find(slug);
    if (!command) {
      throw new Error(`Unknown app_command slug: ${slug}`);
    }

    return command.handler(params, context);
  }
}
