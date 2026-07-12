export interface WidgetLayout {
  i: string;
  component_id: number;
  slug: string;
  library_slug?: string;
  name: string;
  description: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  isResizable: boolean;
}

export interface DashboardComponent {
  id: number;
  slug: string;
  library_slug?: string;
  path: string;
  min_width: number;
  max_width?: number;
  min_height: number;
  max_height?: number;
  width: number;
  height: number;
  is_resizable: boolean;
  dashboard_component_locale?: Array<{
    name: string;
    locale: {
      code: string;
    };
  }>;
}

export interface DashboardAccessResponse {
  hasAccess: boolean;
  dashboard?: {
    id: number;
    slug: string;
    name: string;
  };
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  static: boolean;
}

export interface WidgetRendererProps {
  widget: WidgetLayout;
  onRemove: () => void;
  onCapture?: () => void;
}
