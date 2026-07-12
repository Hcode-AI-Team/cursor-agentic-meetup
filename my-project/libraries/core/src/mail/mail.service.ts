import { DeleteDTO } from '@hed-hog/api';
import { getLocaleText, LocaleService } from '@hed-hog/api-locale';
import { MailService as MailMainService } from '@hed-hog/api-mail';
import { PaginationDTO } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as Handlebars from 'handlebars';
import {
  buildMailConfigFromIntegration,
  getFromAddress,
} from '../integration-profile/integration-profile.utils';
import { IntegrationDeveloperApiService } from '../integration/services/integration-developer-api.service';
import { SettingService } from '../setting/setting.service';
import { CreateDTO } from './dto/create.dto';
import { ImportDTO } from './dto/import.dto';
import { SendTemplatedMailDTO } from './dto/send.dto';
import { TestMailDTO } from './dto/test-mail.dto';
import { UpdateDTO } from './dto/update.dto';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly modelName = 'mail';
  private readonly integrationProfileSettingSlug =
    'mail-integration-profile-id';

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => MailMainService))
    private readonly mailMainService: MailMainService,
    @Inject(forwardRef(() => LocaleService))
    private readonly localeService: LocaleService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    @Inject(forwardRef(() => IntegrationDeveloperApiService))
    private readonly integrationApi: IntegrationDeveloperApiService,
  ) { }

  onModuleInit(): void {
    this.integrationApi.subscribe({
      eventName: 'core.setting.changed',
      consumerName: 'core.mail-config-validator',
      priority: 0,
      handler: async (event) => {
        const slug = String(event.payload?.slug || '').trim();

        if (!this.isMailConfigSlug(slug)) {
          return;
        }

        await this.syncConfiguredMailFlag();
      },
    });

  }

  private isMailConfigSlug(slug: string) {
    return slug === this.integrationProfileSettingSlug;
  }

  private isSettingEnabled(value: unknown) {
    return value === true || value === 'true';
  }

  private async syncConfiguredMailFlag() {
    try {
      const settings = await this.setting.getSettingValues([
        this.integrationProfileSettingSlug,
      ]);
      const profileSlug = String(
        settings[this.integrationProfileSettingSlug] ?? '',
      ).trim();

      if (!profileSlug) {
        await this.setting.setValue('configured-mail', 'false');
        return;
      }

      const { from } = await this.reloadConfig();

      await this.mailMainService.send({
        to: from,
        from,
        subject: '[HedHog] Mail configuration validation',
        body: `This is an automatic validation email for the configured profile (slug: ${profileSlug}).`,
      });

      await this.setting.setValue('configured-mail', 'true');
    } catch (error) {
      this.logger.warn(
        `Mail configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.setting.setValue('configured-mail', 'false');
    }
  }

  /**
   * Reload mail configuration from database and update MailMainService.
   * When profileSlug is provided, that profile is used directly.
    * Otherwise the global integration profile setting is read.
   * Returns the active from address and the built config object.
   */
  async reloadConfig(profileSlug?: string): Promise<{ success: boolean; provider: string; from: string; config: any }> {
    try {
      let resolvedProfileSlug = String(profileSlug ?? '').trim();

      if (!resolvedProfileSlug) {
        const settings = await this.setting.getSettingValues([
          this.integrationProfileSettingSlug,
        ]);
        resolvedProfileSlug = String(
          settings[this.integrationProfileSettingSlug] ?? '',
        ).trim();
      }

      if (!resolvedProfileSlug) {
        throw new BadRequestException('No mail profile configured. Set a mail profile in the Mail settings.');
      }

      const profile = await this.prismaService.integration_profile.findUnique({
        where: { slug: resolvedProfileSlug },
        include: {
          integration_provider: { select: { slug: true } },
          integration_type: { select: { slug: true } },
        },
      });

      if (!profile) {
        throw new NotFoundException(`Mail profile with slug "${resolvedProfileSlug}" not found.`);
      }

      if (profile.integration_type?.slug !== 'email') {
        throw new BadRequestException(
          `Integration profile "${resolvedProfileSlug}" is not an email profile.`,
        );
      }

      const providerSlug = profile.integration_provider.slug;
      const config = buildMailConfigFromIntegration(providerSlug, profile.config);

      this.mailMainService.setConfig(config);
      this.logger.log(`Mail configuration reloaded from profile "${profile.name}" (${providerSlug})`);

      const from = getFromAddress(profile.config);

      return { success: true, provider: providerSlug, from, config };
    } catch (error) {
      this.logger.error('Error reloading mail configuration:', error);
      throw error;
    }
  }

  /**
   * Sends an ad-hoc HTML email using the configured (or given) mail profile,
   * without requiring a stored template. Used by other modules (e.g. agent
   * human-approval notifications).
   */
  async sendRawMail({
    to,
    subject,
    html,
    profileSlug,
  }: {
    to: string;
    subject: string;
    html: string;
    profileSlug?: string;
  }) {
    const { from } = await this.reloadConfig(profileSlug);
    return this.mailMainService.send({ to, from, subject, body: html } as any);
  }


  async list(locale: string, paginationParams: PaginationDTO) {
    const result = await this.localeService.listModelWithLocale(
      locale,
      this.modelName,
      paginationParams,
    );

    if (result.data && Array.isArray(result.data)) {
      const mailIds = result.data.map((item: any) => item.mail_id).filter(Boolean);
      const mailVars = await this.prismaService.mail_var.findMany({
        where: {
          mail_id: {
            in: mailIds,
          },
        },
        select: {
          id: true,
          mail_id: true,
          name: true,
        },
      });

      const varsByMailId = mailVars.reduce((acc, mailVar) => {
        if (!acc[mailVar.mail_id]) {
          acc[mailVar.mail_id] = [];
        }
        acc[mailVar.mail_id].push(mailVar);
        return acc;
      }, {} as Record<number, any[]>);

      result.data = result.data.map((item: any) => ({
        ...item,
        mail_var: varsByMailId[item.mail_id] || [],
      }));
    }

    return result;
  }

  async get(locale: string, id: number) {
    const localeRecord = await this.localeService.getByCode(locale);
    const mail = await this.prismaService.mail.findUnique({
      where: { id },
      include: {
        mail_locale: {
          where: { locale_id: localeRecord.id },
          include: { locale: { select: { code: true } } },
        },
        mail_var: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!mail) {
      throw new NotFoundException(getLocaleText('mail.template.not_found', locale, `Mail template with id ${id} not found`));
    }

    const localeData = mail.mail_locale[0];
    return {
      id: mail.id,
      slug: mail.slug,
      locale_id: localeData?.locale_id,
      mail_id: mail.id,
      subject: localeData?.subject || '',
      body: localeData?.body || '',
      mail_var: mail.mail_var,
      locale: localeData?.locale,
      created_at: mail.created_at,
      updated_at: mail.updated_at,
    };
  }

  async create(data: CreateDTO) {
    const { slug, mail_locale, mail_var } = data;
    const existing = await this.prismaService.mail.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException(`Template with slug "${slug}" already exists.`);
    }

    return this.prismaService.mail.create({
      data: {
        slug,
        mail_locale: mail_locale
          ? {
              create: mail_locale.map((ml) => ({
                locale_id: ml.locale_id,
                subject: ml.subject,
                body: ml.body,
              })),
            }
          : undefined,
        mail_var: mail_var
          ? {
              create: mail_var.map((mv) => ({
                name: mv.name,
              })),
            }
          : undefined,
      },
      include: {
        mail_locale: true,
        mail_var: true,
      },
    });
  }

  async update({ id, data }: { id: number; data: UpdateDTO }) {
    const { slug, mail_locale, mail_var } = data;
    const existingMail = await this.prismaService.mail.findUnique({
      where: { id },
    });

    if (!existingMail) {
      throw new BadRequestException(`Template with id ${id} not found.`);
    }

    if (slug && slug !== existingMail.slug) {
      const slugExists = await this.prismaService.mail.findUnique({
        where: { slug },
      });

      if (slugExists) {
        throw new BadRequestException(`Template with slug "${slug}" already exists.`);
      }

      await this.prismaService.mail.update({
        where: { id },
        data: { slug },
      });
    }

    if (mail_locale && mail_locale.length > 0) {
      for (const ml of mail_locale) {
        const existingLocale = await this.prismaService.mail_locale.findFirst({
          where: {
            mail_id: id,
            locale_id: ml.locale_id,
          },
        });

        if (existingLocale) {
          await this.prismaService.mail_locale.update({
            where: { id: existingLocale.id },
            data: {
              subject: ml.subject,
              body: ml.body,
            },
          });
        } else {
          await this.prismaService.mail_locale.create({
            data: {
              mail_id: id,
              locale_id: ml.locale_id,
              subject: ml.subject,
              body: ml.body,
            },
          });
        }
      }
    }

    if (mail_var !== undefined) {
      await this.prismaService.mail_var.deleteMany({
        where: { mail_id: id },
      });

      if (mail_var.length > 0) {
        await this.prismaService.mail_var.createMany({
          data: mail_var.map((mv) => ({
            mail_id: id,
            name: mv.name,
          })),
        });
      }
    }

    return this.prismaService.mail.findUnique({
      where: { id },
      include: {
        mail_locale: true,
        mail_var: true,
      },
    });
  }

  async delete({ ids }: DeleteDTO): Promise<{ count: number }> {
    if (ids == undefined || ids == null) {
      throw new BadRequestException(
        'You must select at least one item to delete.',
      );
    }
    return this.prismaService.mail.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async sendTemplatedMail(
    locale: string,
    { email, slug, variables }: SendTemplatedMailDTO,
  ) {
    const settings = await this.setting.getSettingValues(['configured-mail']);

    if (!this.isSettingEnabled(settings['configured-mail'])) {
      this.logger.warn('Mail service is not configured. Aborting sending email.');
      return;
    }

    try {
      const { from } = await this.reloadConfig();
      const localeRecord = await this.getLocaleRecord(locale);
      const mail = await this.getMailTemplate(slug, localeRecord.id);
      const { subject, body } = mail.mail_locale[0];
      const parsedSubject = this.interpolateTemplate(subject, variables);
      const parsedBody = this.interpolateTemplate(body, variables);

      await this.mailMainService.send({
        to: email,
        from,
        subject: parsedSubject,
        body: parsedBody,
        mail_id: mail.id,
      });

    } catch (error) {
      this.logger.error('Error sending templated mail:', error);
      await this.setting.setValue('configured-mail', 'false');
    }
  }

  private async getLocaleRecord(locale: string) {
    const localeRecord = await this.prismaService.locale.findUnique({
      where: { code: locale },
    });

    if (!localeRecord) {
      throw new Error(`Locale "${locale}" not found`);
    }

    return localeRecord;
  }

  private async getMailTemplate(slug: string, localeId: number) {
    const mail = await this.prismaService.mail.findUnique({
      where: { slug },
      include: {
        mail_locale: {
          where: { locale_id: localeId },
          select: { subject: true, body: true },
        },
        mail_var: {
          select: { name: true },
        },
      },
    });

    if (!mail) {
      throw new Error(`Template "${slug}" not found for locale "${localeId}"`);
    }

    return mail;
  }

  private interpolateTemplate(
    source: string,
    data: any,
  ): string {
    try {
      const template = Handlebars.compile(source.replace(/(\r\n|\n|\r)/g, '<br/>'));
      return template(data);
    } catch (error: any) {
      this.logger.error('Handlebars template compilation error:', error);
      throw new BadRequestException(
        `Invalid template syntax: ${error.message}. Please use {{variable}} format for variables.`
      );
    }
  }

  async sendTestMail(locale: string, {
    slug,
    email,
    subject,
    body,
    variables,
  }: TestMailDTO) {
    const localeRecord = await this.getLocaleRecord(locale);
    const mail = await this.getMailTemplate(slug, localeRecord.id);
    const settings = await this.setting.getSettingValues(['configured-mail']);

    if (!this.isSettingEnabled(settings['configured-mail'])) {
      throw new BadRequestException('Mail service is not configured.');
    }

    const { from } = await this.reloadConfig();

    try {
      const parsedSubject = variables
        ? this.interpolateTemplate(subject, variables)
        : subject;
      const parsedBody = variables
        ? this.interpolateTemplate(body, variables)
        : body;

      return this.mailMainService.send({
        to: email,
        subject: parsedSubject,
        body: parsedBody,
        mail_id: mail.id,
        from,
      });
    } catch (error) {
      this.logger.error('Error sending test mail:', error);
      throw new BadRequestException('Failed to send test email');
    }
  }

  async importTemplates({ data, overwrite }: ImportDTO) {
    const conflicts: string[] = [];

    if (!overwrite) {
      for (const template of data) {
        const existing = await this.prismaService.mail.findUnique({
          where: { slug: template.slug },
        });

        if (existing) {
          conflicts.push(template.slug);
        }
      }

      if (conflicts.length > 0) {
        return { conflicts };
      }
    }

    const imported: any[] = [];
    for (const template of data) {
      try {
        const locales = await this.prismaService.locale.findMany({
          where: {
            code: {
              in: template.translations.map((t) => t.code),
            },
          },
        });

        const localeMap = new Map(
          locales.map((locale) => [locale.code, locale.id])
        );

        const existing = await this.prismaService.mail.findUnique({
          where: { slug: template.slug },
        });

        if (existing && overwrite) {
          await this.prismaService.mail_locale.deleteMany({
            where: { mail_id: existing.id },
          });

          await this.prismaService.mail_var.deleteMany({
            where: { mail_id: existing.id },
          });

          await this.prismaService.mail_locale.createMany({
            data: template.translations.map((translation) => ({
              mail_id: existing.id,
              locale_id: localeMap.get(translation.code)!,
              subject: translation.subject,
              body: translation.body,
            })),
          });

          if (template.variables && template.variables.length > 0) {
            await this.prismaService.mail_var.createMany({
              data: template.variables.map((variable) => ({
                mail_id: existing.id,
                name: variable,
              })),
            });
          }

          imported.push(existing.id);
        } else if (!existing) {
          const newMail = await this.prismaService.mail.create({
            data: {
              slug: template.slug,
              mail_locale: {
                create: template.translations.map((translation) => ({
                  locale_id: localeMap.get(translation.code)!,
                  subject: translation.subject,
                  body: translation.body,
                })),
              },
              mail_var: template.variables
                ? {
                    create: template.variables.map((variable) => ({
                      name: variable,
                    })),
                  }
                : undefined,
            },
          });

          imported.push(newMail.id);
        }
      } catch (error) {
        this.logger.error(`Error importing template ${template.slug}:`, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(
          `Failed to import template "${template.slug}": ${message}`
        );
      }
    }

    return {
      success: true,
      imported: imported.length,
      templates: imported,
    };
  }
}
