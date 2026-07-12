import {
    coverPage,
    CoverPageData,
    dataTable,
    FeatureCardData,
    featureCards,
    metadataBlock,
    pageAccentBar,
    pageHeader,
    pageShell,
    pdfFooter,
    purposeBlock,
    sectionHeader,
    signatureArea,
} from '../components';
import { PdfThemeConfig } from '../interfaces/pdf-theme-config.interface';

// ─────────────────────────────────────────────────────────────────────────────
// Data contract
// ─────────────────────────────────────────────────────────────────────────────

export interface HcodeInstitutionalData {
  area?: 'consulting' | 'training' | 'research';
  title: string;
  subtitle?: string;
  /** Long-form description rendered as purpose block (primary-color background) */
  description?: string;
  features?: FeatureCardData[];
  tableHeaders?: string[];
  tableRows?: string[][];
  metadata?: Array<{ label: string; value: string }>;
  signatories?: Array<{ label: string; name?: string }>;
  /** Override the bottom meta line on the cover (default: "HCODE · CNPJ 24.700.731/0001-08") */
  coverMeta?: string;
  /** Override the page title shown in the repeating header */
  pageTitle?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template
// ─────────────────────────────────────────────────────────────────────────────

/**
 * hcode Institutional template — Design System v1.0
 *
 * Structure:
 *   Page 1 — Full-bleed cover (break-after)
 *   Page 2+ — accent bar + header + content sections
 *
 * All sections are optional; only present when the corresponding data
 * field is provided and non-empty.
 */
export function hcodeInstitutionalTemplate(
  data: HcodeInstitutionalData,
  config: PdfThemeConfig,
): string {
  const coverData: CoverPageData = {
    title: data.title,
    subtitle: data.subtitle,
    bottomMeta: data.coverMeta,
  };

  const pageTitle = data.pageTitle ?? `${config.area.toUpperCase()} · ${data.title}`;

  // ── Content sections ──────────────────────────────────────────────────────
  const sections: string[] = [];

  // Purpose block (description)
  if (data.description) {
    sections.push(
      purposeBlock(
        'SOBRE O PROJETO',
        config.companyName.toUpperCase(),
        data.description,
      ),
    );
  }

  // Feature cards
  if (data.features && data.features.length > 0) {
    sections.push(sectionHeader('DIFERENCIAIS', 'O que entregamos'));
    sections.push(featureCards(data.features));
  }

  // Data table
  if (
    data.tableHeaders &&
    data.tableHeaders.length > 0 &&
    data.tableRows &&
    data.tableRows.length > 0
  ) {
    sections.push(sectionHeader('EXECUÇÃO', 'Plano de trabalho'));
    sections.push(dataTable(data.tableHeaders, data.tableRows));
  }

  // Metadata block
  if (data.metadata && data.metadata.length > 0) {
    sections.push(metadataBlock(data.metadata));
  }

  // Signature area
  if (data.signatories && data.signatories.length > 0) {
    sections.push(sectionHeader('ACEITE', 'Assinaturas'));
    sections.push(signatureArea(data.signatories));
  }

  // ── Assembly ──────────────────────────────────────────────────────────────
  const body = [
    // Page 1: cover
    coverPage(config, coverData),

    // Page 2+: content
    pageAccentBar(),
    pageHeader(config, pageTitle),
    `<div class="page-content">${sections.join('\n')}</div>`,

    // Fixed footer (appears on every page including cover)
    pdfFooter(config.companyName),
  ].join('\n');

  return pageShell('', body, config);
}
