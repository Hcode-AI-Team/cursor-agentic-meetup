import { PdfAreaType, PdfThemeConfig } from '../interfaces/pdf-theme-config.interface';

// ─────────────────────────────────────────────────────────────────────────────
// Design System v1.0 – April 2026 – hardcoded defaults
// Overrides loaded from SettingService at runtime (see PdfService.loadThemeConfig)
// ─────────────────────────────────────────────────────────────────────────────

export interface AreaDefaults {
  primary: string;
  dark: string;
  light: string;
}

/** Per-area color tokens — Design System v1.0 */
export const HCODE_DEFAULTS: Record<PdfAreaType, AreaDefaults> = {
  // Blue 600 / Blue 800 / Blue 50
  consulting: { primary: '#2D669E', dark: '#1F4A75', light: '#EAF1F8' },
  // Orange 500 / Orange 700 / Orange 50
  training:   { primary: '#FF760C', dark: '#C45400', light: '#FFF0E2' },
  // Violet 600 / Violet 800 / Violet 50
  research:   { primary: '#9400B5', dark: '#6A0083', light: '#F6E6FB' },
};

/** Neutral tokens — shared across all areas */
export const HCODE_NEUTRALS = {
  ink1:     '#101010', // body text
  ink2:     '#5D5D5D',
  ink3:     '#79756C',
  line:     '#ECECEC',
  surface:  '#FFFFFF',
  surface2: '#F8F8F8',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// CSS builders
// ─────────────────────────────────────────────────────────────────────────────

/** Google Fonts import for Inter, Roboto and JetBrains Mono */
export function buildFontImport(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;600;700&family=Roboto:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;
}

/**
 * Generates the <style> block with all Design System CSS variables and rules.
 * Typography scale is calibrated for A4 PDF (794 px viewport).
 */
export function buildThemeCss(config: PdfThemeConfig): string {
  return `<style>
  /* ── CSS Variables ─────────────────────────────────────── */
  :root {
    /* Area accent */
    --primary: ${config.primaryColor};
    --dark:    ${config.darkColor};
    --light:   ${config.lightColor};

    /* Neutrals */
    --ink-1:    ${HCODE_NEUTRALS.ink1};
    --ink-2:    ${HCODE_NEUTRALS.ink2};
    --ink-3:    ${HCODE_NEUTRALS.ink3};
    --line:     ${HCODE_NEUTRALS.line};
    --surface:  ${HCODE_NEUTRALS.surface};
    --surface-2:${HCODE_NEUTRALS.surface2};

    /* Fonts */
    --font-main:  'Inter', sans-serif;
    --font-micro: 'Roboto', sans-serif;
    --font-meta:  'JetBrains Mono', monospace;
  }

  /* ── Reset ─────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    font-family: var(--font-main);
    font-size: 13px;
    color: var(--ink-1);
    background: var(--surface);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Type Scale (A4-calibrated, DS v1.0 proportions) ───── */
  /* Display / 80 → Inter 200, tracking -0.03em */
  .t-display {
    font-family: var(--font-main);
    font-weight: 200;
    font-size: 52px;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--ink-1);
  }
  /* H1 / 56 → Inter 300, tracking -0.02em */
  .t-h1 {
    font-family: var(--font-main);
    font-weight: 300;
    font-size: 36px;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: var(--ink-1);
  }
  /* H2 / 36 → Inter 400 */
  .t-h2 {
    font-family: var(--font-main);
    font-weight: 400;
    font-size: 24px;
    line-height: 1.15;
    color: var(--ink-1);
  }
  /* H3 / 26 → Inter 600 */
  .t-h3 {
    font-family: var(--font-main);
    font-weight: 600;
    font-size: 17px;
    line-height: 1.2;
    color: var(--ink-1);
  }
  /* Eyebrow / 22 → Inter 400, tracking 0.36em, uppercase */
  .t-eyebrow {
    font-family: var(--font-main);
    font-weight: 400;
    font-size: 9px;
    line-height: 1.4;
    letter-spacing: 0.36em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  /* Body / 22 → Inter 300 */
  .t-body {
    font-family: var(--font-main);
    font-weight: 300;
    font-size: 13px;
    line-height: 1.65;
    color: var(--ink-2);
  }
  /* Meta / 14 → JetBrains Mono 500, tracking 0.18em */
  .t-meta {
    font-family: var(--font-meta);
    font-weight: 500;
    font-size: 8px;
    line-height: 1.4;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  /* Micro → Roboto 400 (rodapés, créditos) */
  .t-micro {
    font-family: var(--font-micro);
    font-weight: 400;
    font-size: 8px;
    line-height: 1.4;
    color: var(--ink-3);
  }

  /* ── Color utilities ────────────────────────────────────── */
  .color-primary { color: var(--primary) !important; }
  .bg-primary    { background-color: var(--primary) !important; }
  .bg-light      { background-color: var(--light) !important; }
  .bg-surface2   { background-color: var(--surface-2) !important; }

  /* ── Page layout ────────────────────────────────────────── */
  @page { size: A4; margin: 0; }

  .page-content {
    padding: 32px 48px 80px;
  }

  /* Page break utilities */
  .break-before { page-break-before: always; break-before: page; }
  .break-after  { page-break-after:  always; break-after:  page; }
  .no-break     { page-break-inside: avoid; break-inside: avoid; }

  /* ── Cover page ─────────────────────────────────────────── */
  /* Two-column grid: left=white 55%, right=primary 45% */
  .cover {
    display: grid;
    grid-template-columns: 55% 45%;
    min-height: 297mm;
    page-break-after: always;
    break-after: page;
  }
  .cover-left {
    background: var(--surface);
    padding: 56px 40px 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .cover-right {
    background: var(--primary);
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    position: relative;
    overflow: hidden;
  }
  .cover-right-glyph {
    position: absolute;
    top: -40px;
    right: -20px;
    font-family: var(--font-main);
    font-weight: 300;
    font-size: 280px;
    color: rgba(255,255,255,0.10);
    line-height: 1;
    letter-spacing: -0.01em;
    user-select: none;
    pointer-events: none;
  }
  .cover-right-areas {
    list-style: none;
    width: 100%;
    border-top: 1px solid rgba(255,255,255,0.25);
    position: relative;
    z-index: 1;
  }
  .cover-right-areas li {
    font-family: var(--font-main);
    font-weight: 400;
    font-size: 9px;
    letter-spacing: 0.30em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.90);
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.15);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .cover-right-areas li .num {
    font-family: var(--font-meta);
    font-size: 7px;
    opacity: 0.55;
  }
  .cover-system-label {
    font-family: var(--font-meta);
    font-size: 7px;
    letter-spacing: 0.18em;
    color: rgba(255,255,255,0.55);
    position: absolute;
    top: 16px;
    left: 32px;
  }
  .cover-release-label {
    font-family: var(--font-meta);
    font-size: 7px;
    letter-spacing: 0.18em;
    color: rgba(255,255,255,0.55);
    position: absolute;
    top: 16px;
    right: 32px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cover-release-label::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.70);
  }

  /* ── Wordmark lockup ────────────────────────────────────── */
  .lockup { display: flex; flex-direction: column; gap: 3px; }
  .lockup-wordmark {
    font-family: var(--font-main);
    font-weight: 300;
    font-size: 32px;
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .lockup-wordmark .glyph    { color: var(--primary); }
  .lockup-wordmark .wordmark { color: var(--ink-3); }
  .lockup-area {
    font-family: var(--font-main);
    font-weight: 400;
    font-size: 9px;
    letter-spacing: 0.30em;
    text-transform: uppercase;
    color: var(--primary);
  }

  /* ── Accent bar — fixed at top of EVERY page (cover included) ── */
  .page-accent-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: var(--primary);
    z-index: 999;
  }

  /* ── Page header (logo + page title) ───────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 48px 14px;
    border-bottom: 1px solid var(--line);
  }

  /* ── Section header: eyebrow + title + left accent bar ─── */
  .section-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 24px;
    padding-left: 14px;
    border-left: 3.5px solid var(--primary);
  }

  /* ── Purpose block (colored background) ─────────────────── */
  .purpose-block {
    background: var(--primary);
    border-radius: 14px;
    padding: 28px 32px;
    margin-bottom: 28px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .purpose-block .t-eyebrow { color: rgba(255,255,255,0.65); margin-bottom: 8px; }
  .purpose-block .t-h3 { color: #ffffff; margin-bottom: 12px; font-size: 18px; font-weight: 600; }
  .purpose-block .t-body  { color: rgba(255,255,255,0.85); font-size: 12px; }

  /* ── Feature cards (3-column grid) ─────────────────────── */
  .feature-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }
  .feature-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 18px 14px;
    background: var(--surface);
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .feature-card-icon {
    width: 38px;
    height: 32px;
    border: 1.5px solid var(--line);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    color: var(--primary);
  }
  .feature-card-title {
    font-family: var(--font-main);
    font-weight: 600;
    font-size: 12px;
    color: var(--primary);
    margin-bottom: 5px;
    letter-spacing: -0.01em;
  }
  .feature-card-desc {
    font-family: var(--font-main);
    font-weight: 300;
    font-size: 10px;
    line-height: 1.55;
    color: var(--ink-2);
  }

  /* ── Chip ─────────────────────────────────────────────── */
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--light);
    font-family: var(--font-main);
    font-weight: 400;
    font-size: 9px;
    color: var(--primary);
    letter-spacing: 0.01em;
  }
  .chip::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--primary);
    flex-shrink: 0;
  }

  /* ── Data table ──────────────────────────────────────── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 28px;
  }
  .data-table thead tr { background: var(--light); }
  .data-table th {
    font-family: var(--font-meta);
    font-weight: 500;
    font-size: 8px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--primary);
    padding: 9px 13px;
    text-align: left;
    border-bottom: 1.5px solid var(--primary);
  }
  .data-table td {
    font-family: var(--font-main);
    font-weight: 300;
    font-size: 10px;
    color: var(--ink-2);
    padding: 9px 13px;
    border-bottom: 1px solid var(--line);
  }
  .data-table tbody tr { page-break-inside: avoid; break-inside: avoid; }
  .data-table tbody tr:nth-child(even) td { background: var(--surface-2); }

  /* ── Metadata block ──────────────────────────────────── */
  .metadata-block {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 28px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .metadata-item {
    padding: 14px 16px;
    border-right: 1px solid var(--line);
    background: var(--surface);
  }
  .metadata-item:nth-child(4n) { border-right: none; }
  .metadata-item:nth-child(4n+4) { border-right: none; }
  .metadata-item:nth-child(n+5) { border-top: 1px solid var(--line); }
  .metadata-label {
    font-family: var(--font-meta);
    font-weight: 500;
    font-size: 7px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 4px;
  }
  .metadata-value {
    font-family: var(--font-main);
    font-weight: 400;
    font-size: 11px;
    color: var(--ink-1);
  }

  /* ── Signature area ──────────────────────────────────── */
  .signature-area {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 24px;
    margin-top: 28px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .signature-item { display: flex; flex-direction: column; gap: 6px; }
  .signature-line {
    width: 100%;
    height: 1px;
    background: var(--ink-1);
    margin-bottom: 5px;
  }
  .signature-label {
    font-family: var(--font-micro);
    font-size: 8px;
    color: var(--ink-3);
  }
  .signature-name {
    font-family: var(--font-main);
    font-weight: 400;
    font-size: 10px;
    color: var(--ink-2);
  }

  /* ── Fixed footer (repeats on every page) ───────────── */
  .pdf-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 48px;
    border-top: 1px solid var(--line);
    background: var(--surface);
  }
  /* CSS counter for page numbering */
  @page { counter-increment: page; }
  .pdf-footer-page::after {
    content: counter(page);
    font-family: var(--font-meta);
    font-size: 8px;
    letter-spacing: 0.18em;
    color: var(--ink-3);
  }

  /* Padding to avoid content overlapping the fixed header bar and footer */
  body { padding-top: 6px; padding-bottom: 48px; }
</style>`;
}
