import { Inject, Injectable, InternalServerErrorException, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SettingService } from '../setting/setting.service';
import { PdfAreaType, PdfThemeConfig } from './interfaces/pdf-theme-config.interface';
import { hcodeInstitutionalTemplate } from './templates/hcode-institutional.template';
import { AreaDefaults, HCODE_DEFAULTS } from './themes/hcode.theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfGenerateOptions {
  format?: 'A4' | 'A3' | 'Letter';
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  printBackground?: boolean;
  landscape?: boolean;
  /** Explicit CSS page size (e.g. '1600px'). Takes precedence over `format`/`landscape` when set. */
  width?: string;
  /** Explicit CSS page size (e.g. '1131px'). Takes precedence over `format`/`landscape` when set. */
  height?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parses a CSS pixel size string (e.g. '1600px') into a number, falling back when absent/unparsable. */
function parsePxSize(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = /^([\d.]+)px$/.exec(value.trim());
  return match ? Math.round(Number(match[1])) : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
    private readonly configService: ConfigService,
  ) {}

  // ── Theme config ─────────────────────────────────────────────────────────

  /**
   * Resolves the active PdfThemeConfig for the given area.
   * Reads admin-configured overrides from SettingService and falls back to
   * the hard-coded Design System v1.0 defaults.
   */
  async loadThemeConfig(area: PdfAreaType = 'consulting'): Promise<PdfThemeConfig> {
    const defaults: AreaDefaults = HCODE_DEFAULTS[area];

    try {
      const values = await this.settingService.getSettingValues([
        'pdf-company-name',
        'pdf-logo',
        `pdf-${area}-color`,
        'theme-primary-light', // system-wide brand color
        'image-url',           // system logo
        'system-name',         // system display name fallback
      ]);

      // Color priority:
      //   1. pdf-${area}-color if admin explicitly changed it from the DS default
      //   2. theme-primary-light (global brand color configured in Settings)
      //   3. DS hard-coded default for the area
      const areaSpecificColor = values[`pdf-${area}-color`] as string;
      const primaryColor: string =
        (areaSpecificColor && areaSpecificColor !== defaults.primary)
          ? areaSpecificColor
          : (values['theme-primary-light'] as string) || defaults.primary;

      const areaDefault =
        primaryColor === defaults.primary
          ? defaults
          : { ...defaults, primary: primaryColor };

      // Use pdf-logo if set, otherwise fall back to the system image-url setting.
      // Relative paths (e.g. /logo.svg) are resolved to absolute so Playwright can fetch them.
      const rawLogoUrl: string =
        (values['pdf-logo'] as string) ||
        (values['image-url'] as string) ||
        '';
      const logoOverride = rawLogoUrl ? this.resolveUrl(rawLogoUrl) : '';

      return {
        area,
        companyName:
          (values['pdf-company-name'] as string) ||
          (values['system-name'] as string) ||
          'hcode',
        logoOverride,
        primaryColor: areaDefault.primary,
        darkColor: areaDefault.dark,
        lightColor: areaDefault.light,
      };
    } catch {
      this.logger.warn(
        `Could not load PDF settings from SettingService – using Design System defaults for area "${area}".`,
      );
      return {
        area,
        companyName: 'hcode',
        logoOverride: '',
        primaryColor: defaults.primary,
        darkColor: defaults.dark,
        lightColor: defaults.light,
      };
    }
  }

  /**
   * Resolves a potentially relative URL (e.g. /logo.svg) to an absolute URL
   * using the API base URL derived from environment variables.
   */
  private resolveUrl(url: string): string {
    if (!url) return '';
    if (
      url.startsWith('data:') ||
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      return url;
    }
    const port = this.configService.get<string | number>('PORT') ?? 3100;
    const baseUrl =
      this.configService.get<string>('API_URL') ??
      `http://localhost:${port}`;
    return (
      baseUrl.replace(/\/$/, '') +
      (url.startsWith('/') ? url : '/' + url)
    );
  }

  // ── HTML → PDF ────────────────────────────────────────────────────────────

  /**
   * Renders an HTML string to a PDF buffer using Playwright/Chromium.
   *
   * Uses dynamic `import()` via `new Function` to remain compatible with
   * CommonJS bundle output (same pattern as operations.service.ts).
   */
  async generatePdfFromHtml(html: string, options: PdfGenerateOptions = {}): Promise<Buffer> {
    const executablePath = this.configService.get<string>('CHROMIUM_EXECUTABLE_PATH');
    const noSandbox = this.configService.get<string>('CHROMIUM_NO_SANDBOX') === 'true';

    const launchArgs = noSandbox
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : [];

    let browser: any = null;

    try {
      const importPlaywright = new Function(
        'moduleName',
        'return import(moduleName);',
      ) as (moduleName: string) => Promise<any>;

      const playwright = await importPlaywright('playwright');

      browser = await playwright.chromium.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        args: launchArgs,
      });

      const page = await browser.newPage();

      // Viewport must match the requested PDF page size (`width`/`height`),
      // otherwise CSS vw/vh units in the HTML are computed against the wrong
      // box and everything laid out with them (e.g. certificate fields) ends
      // up misaligned once Chromium scales the page to the paper size. Falls
      // back to the A4 default (96dpi 210x297mm) when no explicit size is given.
      await page.setViewportSize({
        width: parsePxSize(options.width, 794),
        height: parsePxSize(options.height, 1123),
      });
      await page.setContent(html, { waitUntil: 'networkidle' });

      const pdfBuffer = await page.pdf(
        options.width && options.height
          ? {
              width: options.width,
              height: options.height,
              printBackground: options.printBackground ?? true,
              margin: options.margin ?? { top: '0', right: '0', bottom: '0', left: '0' },
            }
          : {
              format: options.format ?? 'A4',
              printBackground: options.printBackground ?? true,
              landscape: options.landscape ?? false,
              margin: options.margin ?? { top: '0', right: '0', bottom: '0', left: '0' },
            },
      );

      return Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? (error.stack ?? errorMessage) : String(error);

      const missingRuntime =
        /Cannot find package ['"]playwright['"]|Cannot find module ['"]playwright['"]|Executable doesn't exist|browserType\.launch|Failed to launch|Please run the following command/i.test(
          errorMessage,
        );

      this.logger.error(`PDF generation failed. ${errorMessage}`, errorStack);

      if (missingRuntime) {
        throw new InternalServerErrorException(
          'Playwright runtime is not available. Run `pnpm --filter api run playwright:install` in the API environment.',
        );
      }

      throw new InternalServerErrorException(`PDF generation failed: ${errorMessage}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  // ── Template engine ───────────────────────────────────────────────────────

  /**
   * Generates a PDF from a named template and structured data.
   * The theme is resolved automatically from `data.area` via SettingService.
   */
  async generatePdfFromTemplate(
    templateName: string,
    data: Record<string, any>,
    options?: PdfGenerateOptions,
  ): Promise<Buffer> {
    const area = (data.area as PdfAreaType) ?? 'consulting';
    const themeConfig = await this.loadThemeConfig(area);

    let html: string;

    switch (templateName) {
      case 'hcode-institutional':
        html = hcodeInstitutionalTemplate(data as any, themeConfig);
        break;
      default:
        throw new InternalServerErrorException(
          `Unknown PDF template: "${templateName}". Available: hcode-institutional`,
        );
    }

    return this.generatePdfFromHtml(html, options);
  }
}
