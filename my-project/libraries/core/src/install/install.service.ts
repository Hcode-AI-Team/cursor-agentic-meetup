import { PrismaService } from '@hed-hog/api-prisma';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { SecurityService } from '../security/security.service';
import { SettingService } from '../setting/setting.service';
import { InstallDTO } from './dto/install.dto';

@Injectable()
export class InstallService {

  private readonly logger = new Logger(InstallService.name);

  constructor(
    private readonly security: SecurityService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly settingService: SettingService,
  ) { }

  private normalizeUrl(value: string) {
    return value.trim().replace(/\/$/, '');
  }

  private async forceReset() {

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In development, touching main.ts triggers restart; in production only dist exists.
    const candidatePaths = [
      resolve(process.cwd(), 'src', 'main.ts'),
      resolve(process.cwd(), 'dist', 'apps', 'api', 'src', 'main.js'),
      resolve(process.cwd(), 'dist', 'src', 'main.js'),
    ];
    const mainFilePath = candidatePaths.find((filePath) => existsSync(filePath));
    if (!mainFilePath) {
      this.logger.warn('Skip force reset: no main entry file found to touch.');
      return;
    }

    let mainContent: string;
    try {
      mainContent = readFileSync(mainFilePath, 'utf-8');
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to read main entry file: ${err.message}`,
      );
    }
    try {
      this.logger.verbose(
        `Forcing application restart by touching ${mainFilePath}...`,
      );
      await writeFile(mainFilePath, mainContent, 'utf-8');
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to write main entry file: ${err.message}`,
      );
    }

  }

  private async checkInstallation() {
    const installedSetting = await this.prisma.setting.findFirst({
      where: {
        slug: 'installed',
      },
      select: {
        value: true,
      },
    });

    if (installedSetting?.value === 'true') {
      return true;
    }

    const usersCount = await this.prisma.user.count();
    return usersCount > 0;
  }

  private async updateEnvSecrets(pepper: string) {

    const envFilePath = resolve(process.cwd(), '..', '..', 'apps', 'api', '.env');
    if (!existsSync(envFilePath)) {
      throw new BadRequestException('.env file not found.');
    }

    let envContent: string;
    try {
      envContent = await readFileSync(envFilePath, 'utf-8');
    } catch (err: any) {
      throw new BadRequestException(`Failed to read .env file: ${err.message}`);
    }

    const envConfig = this.parseEnv(envContent);

    if (!('DATABASE_URL' in envConfig)) {
      const envExamplePath = resolve(process.cwd(), '..', '..', 'apps', 'api', '.env.example');
      if (!existsSync(envExamplePath)) {
        throw new BadRequestException('.env.example file not found.');
      }
      try {
        const exampleContent = await readFileSync(envExamplePath, 'utf-8');
        await writeFile(envFilePath, exampleContent, 'utf-8');
        envContent = exampleContent;
        Object.assign(envConfig, this.parseEnv(envContent));
      } catch (err: any) {
        throw new BadRequestException(`Failed to copy .env.example: ${err.message}`);
      }
    }

    envConfig['JWT_SECRET'] = this.base64Encode(this.security.randomOpaque(32));
    envConfig['PEPPER'] = pepper;

    // Only wrap in double quotes if the value contains spaces, #, or special characters
    const newEnvContent = Object.entries(envConfig)
      .map(([key, value]) => {
        // If value contains only safe characters, no quotes needed
        if (/^[A-Za-z0-9._-]+$/.test(value)) {
          return `${key}=${value}`;
        }
        // Otherwise, escape quotes and wrap in double quotes
        return `${key}="${value.replace(/"/g, '\\"')}"`;
      })
      .join('\n');

    try {
      this.logger.verbose('Updating .env file with new secrets...');
      await writeFile(envFilePath, newEnvContent, 'utf-8');
    } catch (err: any) {
      throw new BadRequestException(`Failed to write .env file: ${err.message}`);
    }
  }

  private parseEnv(content: string): Record<string, string> {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const envConfig: Record<string, string> = {};
    for (const line of lines) {
      if (line.startsWith('#') || !line.includes('=')) continue;
      const [key, ...rest] = line.split('=');
      if (!key || rest.length === 0) continue;
      let value = rest.join('=').trim();
      // Remove surrounding double quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"');
      }
      envConfig[key.trim()] = value;
    }
    return envConfig;
  }

  private base64Encode(str: string): string {
    return Buffer.from(str).toString('base64');
  }

  async install({
    adminUrl,
    apiUrl,
    appName,
    email,
    password,
    slogan,
    userName,
  }: InstallDTO) {

    if (await this.checkInstallation()) {
      throw new BadRequestException('Application is already installed.');
    }

    const normalizedAdminUrl = this.normalizeUrl(adminUrl ?? 'http://localhost:3200');
    const normalizedApiUrl = this.normalizeUrl(apiUrl ?? 'http://localhost:3100');

    await this.prisma.$transaction(async (prisma) => {

      this.logger.log('Starting installation process...');

      await prisma.setting.updateMany({
        where: {
          slug: {in: ['system-name', 'mfa-issuer']}
        },
        data: {
          value: appName
        }
      });

      this.logger.log(`Set system name to: ${appName}`);

      this.logger.log(`Setting system slogan to: ${slogan}`);

      await prisma.setting.update({
        where: {
          slug: 'system-slogan'
        },
        data: {
          value: slogan
        }
      });

      await prisma.setting.update({
        where: {
          slug: 'url',
        },
        data: {
          value: normalizedAdminUrl,
        },
      });

      await prisma.setting.update({
        where: {
          slug: 'api-url',
        },
        data: {
          value: normalizedApiUrl,
        },
      });

      this.logger.log('System slogan set.');

      this.logger.log(`Setting system email to: ${email}`);

      const check = await prisma.user.findFirst({
        where: {
          user_identifier: {
            some: {
              type: 'email',
              value: email,
              enabled: true
            }
          }
        }
      });

      if (check) {
        throw new BadRequestException('A user with this email already exists.');
      }

      this.logger.log(`Creating admin user: ${userName} <${email}>`);

      const pepper = this.configService.get<string>('PEPPER');
      if (!pepper) {
        throw new BadRequestException(
          'PEPPER is not configured. Set PEPPER before installation.',
        );
      }

      const passwordHash = await this.security.hashArgon2(password, pepper);

      const user = await prisma.user.create({
        data: {
          name: userName,
          user_identifier: {
            create: {
              type: 'email',
              value: email,
              enabled: true,
            }
          },
          user_credential: {
            create: {
              type: 'password',
              hash: passwordHash,
            }
          }
        }
      });

      this.logger.log(`Admin user created with ID: ${user.id}`);

      const roles = await prisma.role.findMany();

      if (roles.length === 0) {
        throw new BadRequestException('No roles found. Please seed the roles before installation.');
      }

      this.logger.log(`Assigning roles to user ID: ${user.id}`);

      await prisma.role_user.createMany({
        data: roles.map((role) => ({
          role_id: role.id,
          user_id: user.id,
        })),
      });

      this.logger.log(`Roles assigned to user ID: ${user.id}`);

      await prisma.setting.update({
        where: {
          slug: 'installed',
        },
        data: {
          value: 'true',
        },
      });

      this.logger.log('Installation flag set to true.');

      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (isDevelopment) {
        await this.updateEnvSecrets(pepper);
        await this.forceReset();
      } else {
        this.logger.log(
          'Skipping env secret update and force reset outside development.',
        );
      }

      this.logger.log('Installation process completed successfully.');

    });

    this.settingService.clearCache();

    return { success: true };

  }

  async check() {
    return {
      success: true,
      installed: await this.checkInstallation(),
    };
  }

  async generateMailMigration({
    slug,
    translations,
    variables,
  }: {
    slug: string;
    translations: Array<{ locale_code: string; subject: string; body: string }>;
    variables: string[];
  }) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      const migrationName = `${timestamp}_mail_${slug.replace(/[^a-z0-9]/gi, '_')}`;
      const migrationsPath = resolve(process.cwd(), 'prisma', 'migrations', migrationName);

      const fs = await import('fs/promises');
      await fs.mkdir(migrationsPath, { recursive: true });

      const escapeSQL = (str: string) => str.replace(/'/g, "''");
      let sql = `-- CreateMailTemplate: ${slug}\n\n`;
      sql += `-- Insert mail template\n`;
      sql += `INSERT INTO "mail" ("slug", "created_at", "updated_at")\n`;
      sql += `VALUES ('${escapeSQL(slug)}', NOW(), NOW())\n`;
      sql += `ON CONFLICT ("slug") DO NOTHING;\n\n`;

      if (translations && translations.length > 0) {
        sql += `-- Insert mail locales\n`;
        sql += `INSERT INTO "mail_locale" ("mail_id", "locale_id", "subject", "body")\n`;
        sql += `VALUES \n`;
        const localeValues = translations.map((translation, index) => {
          const comma = index < translations.length - 1 ? ',' : '';
          return `  ((SELECT "id" FROM "mail" WHERE "slug" = '${escapeSQL(slug)}'), (SELECT "id" FROM "locale" WHERE "code" = '${escapeSQL(translation.locale_code)}'), '${escapeSQL(translation.subject)}', '${escapeSQL(translation.body)}')${comma}`;
        }).join('\n');
        sql += localeValues;
        sql += `\nON CONFLICT ("mail_id", "locale_id") DO UPDATE\n`;
        sql += `  SET "subject" = EXCLUDED."subject",\n`;
        sql += `      "body" = EXCLUDED."body";\n\n`;
      }

      if (variables && variables.length > 0) {
        sql += `-- Insert mail variables\n`;
        sql += `INSERT INTO "mail_var" ("mail_id", "name")\n`;
        sql += `VALUES \n`;
        const varValues = variables.map(v => 
          `  ((SELECT "id" FROM "mail" WHERE "slug" = '${escapeSQL(slug)}'), '${escapeSQL(v)}')`
        ).join(',\n');
        sql += varValues;
        sql += `\nON CONFLICT ("mail_id", "name") DO NOTHING;\n`;
      }

      const migrationFilePath = resolve(migrationsPath, 'migration.sql');
      await fs.writeFile(migrationFilePath, sql, 'utf-8');
      this.logger.log(`Migration created: ${migrationName}`);

      return {
        success: true,
        migrationName,
        path: migrationsPath,
      };
    } catch (error: any) {
      this.logger.error('Error generating mail migration:', error);
      throw new BadRequestException(`Failed to generate migration: ${error.message}`);
    }
  }
}
