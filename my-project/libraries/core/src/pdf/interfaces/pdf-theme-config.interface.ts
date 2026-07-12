export type PdfAreaType = 'consulting' | 'training' | 'research';

export interface PdfThemeConfig {
  area: PdfAreaType;
  companyName: string;
  logoOverride: string;
  primaryColor: string;
  darkColor: string;
  lightColor: string;
}
