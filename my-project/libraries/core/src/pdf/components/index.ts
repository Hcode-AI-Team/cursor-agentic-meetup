import { PdfThemeConfig } from '../interfaces/pdf-theme-config.interface';
import { buildFontImport, buildThemeCss } from '../themes/hcode.theme';

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG icon paths (24×24 viewBox, stroke-width 2.2 — Design System spec)
// ─────────────────────────────────────────────────────────────────────────────
const ICON_PATHS: Record<string, string> = {
  discovery:
    '<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  strategy:
    '<rect x="3" y="12" width="4" height="9" rx="1" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<rect x="10" y="7" width="4" height="14" rx="1" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<rect x="17" y="3" width="4" height="18" rx="1" stroke="currentColor" stroke-width="2.2" fill="none"/>',
  governance:
    '<polygon points="12,2 22,7 22,17 12,22 2,17 2,7" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<polygon points="12,7 17,9.5 17,14.5 12,17 7,14.5 7,9.5" stroke="currentColor" stroke-width="2.2" fill="none"/>',
  training:
    '<path d="M22 10v6m0 0l-10 5-10-5V10l10 5 10-5z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
  curriculum:
    '<rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<line x1="7" y1="8" x2="17" y2="8" stroke="currentColor" stroke-width="2.2"/>' +
    '<line x1="7" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="2.2"/>',
  agents:
    '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<line x1="12" y1="3" x2="12" y2="1" stroke="currentColor" stroke-width="2.2"/>' +
    '<line x1="12" y1="23" x2="12" y2="21" stroke="currentColor" stroke-width="2.2"/>' +
    '<line x1="3" y1="12" x2="1" y2="12" stroke="currentColor" stroke-width="2.2"/>' +
    '<line x1="23" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2.2"/>',
  datasets:
    '<rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2.2" fill="none"/>',
  impact:
    '<polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" stroke-width="2.2" fill="none" ' +
    'stroke-linecap="round" stroke-linejoin="round"/>',
  experiment:
    '<path d="M9 3h6M9 3v7L4.5 17A2 2 0 006.4 20h11.2a2 2 0 001.9-3L15 10V3" ' +
    'stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  default:
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2.2"/>' +
    '<circle cx="12" cy="16" r="0.8" fill="currentColor"/>',
};

function inlineSvgIcon(name: string): string {
  const path = ICON_PATHS[name] ?? ICON_PATHS.default;
  return (
    `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" ` +
    `xmlns="http://www.w3.org/2000/svg">${path}</svg>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the logo HTML.
 * If the admin has set a pdf-logo URL/data-URI → renders <img>.
 * Otherwise renders the CSS-based wordmark from the Design System spec.
 */
export function buildLogoHtml(config: PdfThemeConfig, compact = false): string {
  if (config.logoOverride) {
    const h = compact ? '28px' : '36px';
    return (
      `<img src="${config.logoOverride}" alt="${config.companyName}" ` +
      `style="max-height:${h};max-width:140px;object-fit:contain;">`
    );
  }
  if (compact) {
    // Header-size lockup
    return `<div style="display:flex;flex-direction:column;gap:2px;">
  <div style="font-family:'Inter',sans-serif;font-weight:300;font-size:22px;letter-spacing:-0.01em;line-height:1;">
    <span style="color:var(--primary)">h</span><span style="color:var(--ink-3)">code</span>
  </div>
  <div style="font-family:'Inter',sans-serif;font-weight:400;font-size:7px;letter-spacing:0.30em;text-transform:uppercase;color:var(--primary);">${config.area.toUpperCase()}</div>
</div>`;
  }
  return `<div class="lockup">
  <div class="lockup-wordmark">
    <span class="glyph">h</span><span class="wordmark">code</span>
  </div>
  <div class="lockup-area">${config.area.toUpperCase()}</div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shell
// ─────────────────────────────────────────────────────────────────────────────

/** Wraps everything in a complete HTML document with fonts + theme CSS. */
export function pageShell(extraHead: string, body: string, config: PdfThemeConfig): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${buildFontImport()}
  ${buildThemeCss(config)}
  ${extraHead}
</head>
<body>
  ${body}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cover page
// ─────────────────────────────────────────────────────────────────────────────

export interface CoverPageData {
  title: string;
  subtitle?: string;
  /** defaults to current date formatted */
  dateLabel?: string;
  /** defaults to "HCODE · CNPJ 24.700.731/0001-08" */
  bottomMeta?: string;
}

/** Full-bleed A4 cover with Design System two-column layout. */
export function coverPage(config: PdfThemeConfig, data: CoverPageData): string {
  const date =
    data.dateLabel ??
    new Date()
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .toUpperCase();

  const areas = [
    { num: '01', label: 'CONSULTING' },
    { num: '02', label: 'TRAINING' },
    { num: '03', label: 'RESEARCH' },
  ];

  return `<div class="cover">
  <!-- LEFT: white, content -->
  <div class="cover-left">
    <div>
      <div class="t-meta" style="margin-bottom:40px;">DESIGN SYSTEM · V1.0 · ${date}</div>
      ${buildLogoHtml(config)}
      <div style="margin-top:32px;margin-bottom:20px;">
        <div class="t-display">${data.title}</div>
      </div>
      ${data.subtitle ? `<div class="t-body" style="max-width:340px;font-size:12px;">${data.subtitle}</div>` : ''}
    </div>
    <div class="t-micro">${data.bottomMeta ?? 'HCODE · CNPJ 24.700.731/0001-08'}</div>
  </div>

  <!-- RIGHT: primary color, glyph + area list -->
  <div class="cover-right">
    <div class="cover-system-label">HCODE / SYSTEM</div>
    <div class="cover-release-label">RELEASE 01</div>
    <div class="cover-right-glyph">h</div>
    <ul class="cover-right-areas">
      ${areas
        .map(
          (a) =>
            `<li><span class="num">0${areas.indexOf(a) + 1}</span>${a.label}</li>`,
        )
        .join('')}
    </ul>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page header (accent bar + logo row)
// ─────────────────────────────────────────────────────────────────────────────

/** Thin primary-colored bar at the very top of a content page. */
export function pageAccentBar(): string {
  return `<div class="page-accent-bar"></div>`;
}

/** Header row: compact logo lockup on the left, page title (meta) on the right.
 *  Matches Design System pattern: logo | ● PAGE · TITLE
 */
export function pageHeader(config: PdfThemeConfig, pageTitle: string): string {
  return `<div class="page-header">
  ${buildLogoHtml(config, true)}
  <div style="display:flex;align-items:center;gap:6px;">
    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--primary);flex-shrink:0;"></span>
    <div class="t-meta" style="color:var(--ink-3);">${pageTitle.toUpperCase()}</div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header
// ─────────────────────────────────────────────────────────────────────────────

/** Eyebrow + H2 title with primary-color left accent bar — Design System spec. */
export function sectionHeader(eyebrow: string, title: string): string {
  return `<div class="section-header">
  <div class="t-eyebrow">${eyebrow}</div>
  <div class="t-h2">${title}</div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Purpose block
// ─────────────────────────────────────────────────────────────────────────────

/** Full-width colored block (primary background) with eyebrow, title and body. */
export function purposeBlock(eyebrow: string, title: string, body: string): string {
  return `<div class="purpose-block no-break">
  <div class="t-eyebrow">${eyebrow}</div>
  <div class="t-h3">${title}</div>
  <div class="t-body">${body}</div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature cards
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureCardData {
  /** Key from the ICON_PATHS map (e.g. "discovery", "strategy") */
  icon?: string;
  title: string;
  description: string;
}

/** 3-column feature card grid — icon tile + colored title + body. */
export function featureCards(cards: FeatureCardData[]): string {
  const items = cards
    .map(
      (c) => `<div class="feature-card no-break">
  <div class="feature-card-icon">${inlineSvgIcon(c.icon ?? 'default')}</div>
  <div class="feature-card-title">${c.title}</div>
  <div class="feature-card-desc">${c.description}</div>
</div>`,
    )
    .join('');
  return `<div class="feature-cards">${items}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip
// ─────────────────────────────────────────────────────────────────────────────

/** Pill chip with area-colored dot — Design System spec. */
export function chip(label: string): string {
  return `<span class="chip">${label}</span>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data table
// ─────────────────────────────────────────────────────────────────────────────

/** Responsive data table with page-break-inside:avoid on rows. */
export function dataTable(headers: string[], rows: string[][]): string {
  const ths = headers.map((h) => `<th>${h}</th>`).join('');
  const trs = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');
  return `<table class="data-table">
  <thead><tr>${ths}</tr></thead>
  <tbody>${trs}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata block
// ─────────────────────────────────────────────────────────────────────────────

/** 4-column grid of label+value cells with rounded border. */
export function metadataBlock(items: Array<{ label: string; value: string }>): string {
  const cells = items
    .map(
      (item) => `<div class="metadata-item">
  <div class="metadata-label">${item.label}</div>
  <div class="metadata-value">${item.value}</div>
</div>`,
    )
    .join('');
  return `<div class="metadata-block">${cells}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signature area
// ─────────────────────────────────────────────────────────────────────────────

/** Auto-grid of signature lines with optional name label. */
export function signatureArea(
  signatories: Array<{ label: string; name?: string }>,
): string {
  const items = signatories
    .map(
      (s) => `<div class="signature-item">
  <div class="signature-line"></div>
  <div class="signature-label">${s.label}</div>
  ${s.name ? `<div class="signature-name">${s.name}</div>` : ''}
</div>`,
    )
    .join('');
  return `<div class="signature-area">${items}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixed footer (repeats on every PDF page)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fixed footer that appears on every page.
 * Left: company + doc label. Right: page counter via CSS counter(page).
 */
export function pdfFooter(companyName = 'hcode', docLabel = 'DESIGN SYSTEM V1.0'): string {
  return `<div class="pdf-footer">
  <div class="t-micro">${companyName.toUpperCase()} · ${docLabel}</div>
  <div class="t-micro pdf-footer-page"></div>
</div>`;
}
