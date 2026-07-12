'use client';

import dynamic from 'next/dynamic';
import type React from 'react';

import {
  EmptyState,
  Page,
  PageHeader,
  PaginationFooter,
  SearchBar,
} from '@/components/entity-list';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TagsInput } from '@/components/ui/tags-input';
import { usePagination } from '@/hooks/use-pagination';
import { formatDate } from '@/lib/format-date';
import { useApp } from '@hed-hog/next-app-provider';
import {
  Database,
  Download,
  FileDown,
  Mail as MailIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const RichTextEditor = dynamic(
  () =>
    import('@/components/rich-text-editor').then((mod) => ({
      default: mod.RichTextEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-48 bg-muted rounded-md animate-pulse" />
    ),
  }
);

interface Mail {
  id: number;
  slug: string;
  created_at: string;
  updated_at: string;
  locale_id: number;
  mail_id: number;
  subject: string;
  body: string;
  mail_var: any[];
  locale: {
    code: string;
  };
}

interface ImportResponse {
  conflicts?: string[];
  success?: boolean;
  imported?: number;
  templates?: number[];
}

export default function EmailTemplatesPage() {
  const { locales, request, currentLocaleCode, getSettingValue } = useApp();
  const t = useTranslations('core.MailPage');
  const {
    items,
    refetch,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    search,
    setSearch,
  } = usePagination({ url: '/mail' });
  const [templates, setTemplates] = useState<Mail[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Mail | null>(null);
  const [selectedLocaleCode, setSelectedLocaleCode] = useState<string>('en');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    subject: '',
    body: '',
    variables: [] as string[],
  });
  const [variableTestValues, setVariableTestValues] = useState<
    Record<string, string>
  >({});
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailVariableValues, setTestEmailVariableValues] = useState<
    Record<string, string>
  >({});
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(
    new Set()
  );
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [conflictingSlugs, setConflictingSlugs] = useState<string[]>([]);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);

  useEffect(() => {
    if (items) {
      const seen = new Set<number>();
      const uniqueTemplates = items.filter((template: Mail) => {
        if (seen.has(template.mail_id)) {
          return false;
        }
        seen.add(template.mail_id);
        return true;
      });
      setTemplates(uniqueTemplates);
    }
  }, [items]);

  useEffect(() => {
    const savedValues = localStorage.getItem('mail-template-variable-values');
    if (savedValues) {
      try {
        const parsed = JSON.parse(savedValues);
        setVariableTestValues(parsed);
        setTestEmailVariableValues(parsed);
      } catch (error) {
        console.error('Error loading saved variable values:', error);
      }
    }

    const savedRecipient = localStorage.getItem('mail-template-test-recipient');
    if (savedRecipient) {
      setTestEmailRecipient(savedRecipient);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(variableTestValues).length > 0) {
      localStorage.setItem(
        'mail-template-variable-values',
        JSON.stringify(variableTestValues)
      );
    }
  }, [variableTestValues]);

  useEffect(() => {
    if (Object.keys(testEmailVariableValues).length > 0) {
      localStorage.setItem(
        'mail-template-variable-values',
        JSON.stringify(testEmailVariableValues)
      );
    }
  }, [testEmailVariableValues]);

  useEffect(() => {
    if (testEmailRecipient) {
      localStorage.setItem('mail-template-test-recipient', testEmailRecipient);
    }
  }, [testEmailRecipient]);

  const handleCreate = () => {
    setEditMode(false);
    setSelectedTemplate(null);
    setSelectedLocaleCode(locales[0]?.code || 'en');
    setFormData({ slug: '', subject: '', body: '', variables: [] });

    const savedValues = localStorage.getItem('mail-template-variable-values');
    if (savedValues) {
      try {
        setVariableTestValues(JSON.parse(savedValues));
      } catch (error) {
        setVariableTestValues({});
      }
    } else {
      setVariableTestValues({});
    }

    setIsDialogOpen(true);
  };

  const getLocaleIdFromCode = (code: string): number => {
    const index = locales.findIndex((l) => l.code === code);
    return index >= 0 ? index + 1 : 1;
  };

  const handleEdit = async (template: Mail) => {
    setEditMode(true);
    setSelectedTemplate(template);

    const localeCode = template.locale?.code || locales[0]?.code || 'en';
    setSelectedLocaleCode(localeCode);

    setFormData({
      slug: template.slug,
      subject: template.subject || '',
      body: template.body || '',
      variables: template.mail_var.map((mv) => mv.name) || [],
    });

    const savedValues = localStorage.getItem('mail-template-variable-values');
    if (savedValues) {
      try {
        setVariableTestValues(JSON.parse(savedValues));
      } catch (error) {
        setVariableTestValues({});
      }
    } else {
      setVariableTestValues({});
    }

    setIsDialogOpen(true);

    try {
      const { data } = await request<Mail>({
        url: `/mail/${template.mail_id || template.id}?locale=${localeCode}`,
        method: 'GET',
      });

      setFormData({
        slug: data.slug,
        subject: data.subject || '',
        body: data.body || '',
        variables: data.mail_var.map((mv) => mv.name) || [],
      });
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const handleLocaleChange = async (localeCode: string) => {
    setSelectedLocaleCode(localeCode);

    if (selectedTemplate) {
      try {
        const { data } = await request<Mail>({
          url: `/mail/${selectedTemplate.mail_id || selectedTemplate.id}?locale=${localeCode}`,
          method: 'GET',
        });

        setFormData({
          ...formData,
          subject: data.subject || '',
          body: data.body || '',
        });
      } catch (error) {
        console.error('Error loading template locale:', error);
      }
    }
  };

  const handleDelete = (id: number) => {
    setTemplateToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete !== null) {
      try {
        await request({
          url: '/mail',
          method: 'DELETE',
          data: { ids: [templateToDelete] },
        });
        refetch();
        toast.success(t('deleteSuccess'));
        setTemplateToDelete(null);
        setIsDeleteDialogOpen(false);
      } catch (error) {
        toast.error(t('deleteError'));
        console.error(error);
      }
    }
  };

  const handleGenerateMigration = async () => {
    if (!selectedTemplate) {
      toast.error(t('noTemplateSelected'));
      return;
    }

    try {
      const translationsData = await Promise.all(
        locales.map(async (locale) => {
          try {
            const { data } = await request<Mail>({
              url: `/mail/${selectedTemplate.mail_id || selectedTemplate.id}?locale=${locale.code}`,
              method: 'GET',
            });
            return {
              locale_code: locale.code,
              subject: data.subject,
              body: data.body,
            };
          } catch (error) {
            console.warn(
              `Failed to fetch translation for ${locale.code}:`,
              error
            );
            return null;
          }
        })
      );

      const validTranslations = translationsData.filter(
        (t) => t !== null && t.subject && t.body
      );

      if (validTranslations.length === 0) {
        toast.error(t('noValidTranslations'));
        return;
      }

      await request({
        url: '/install/generate-mail-migration',
        method: 'POST',
        data: {
          slug: formData.slug,
          translations: validTranslations,
          variables: formData.variables,
        },
      });

      toast.success(t('migrationSuccess'));
    } catch (error) {
      console.error('Error generating migration:', error);
      toast.error(t('migrationError'));
    }
  };

  const handleSendTestEmail = () => {
    const savedRecipient = localStorage.getItem('mail-template-test-recipient');
    if (savedRecipient) {
      setTestEmailRecipient(savedRecipient);
    } else {
      setTestEmailRecipient('');
    }

    const savedValues = localStorage.getItem('mail-template-variable-values');
    if (savedValues) {
      try {
        setTestEmailVariableValues(JSON.parse(savedValues));
      } catch (error) {
        setTestEmailVariableValues({});
      }
    } else {
      setTestEmailVariableValues({});
    }

    setIsTestEmailDialogOpen(true);
  };

  const handleConfirmSendTestEmail = async () => {
    try {
      await request({
        url: '/mail/test',
        method: 'POST',
        data: {
          slug: formData.slug,
          email: testEmailRecipient,
          subject: formData.subject,
          body: formData.body,
          variables: testEmailVariableValues,
        },
      });
      toast.success(t('testEmailSuccess'));
      setIsTestEmailDialogOpen(false);
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(t('testEmailError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const localeId = getLocaleIdFromCode(selectedLocaleCode);
    const payload = {
      slug: formData.slug,
      mail_locale: [
        {
          locale_id: localeId,
          subject: formData.subject,
          body: formData.body,
        },
      ],
      mail_var: formData.variables.map((v) => ({
        name: v.trim(),
      })),
    };

    try {
      if (editMode && selectedTemplate) {
        await request<Mail>({
          url: `/mail/${selectedTemplate.mail_id || selectedTemplate.id}`,
          method: 'PATCH',
          data: payload,
        });
        toast.success(t('templateEditSuccess'));
      } else {
        await request<Mail>({
          url: '/mail',
          method: 'POST',
          data: payload,
        });
        toast.success(t('templateCreateSuccess'));
      }

      refetch();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleToggleTemplate = (id: number) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTemplates(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedTemplates.size === templates.length) {
      setSelectedTemplates(new Set());
    } else {
      setSelectedTemplates(new Set(templates.map((t) => t.mail_id || t.id)));
    }
  };

  const handleExportSelected = async () => {
    if (selectedTemplates.size === 0) {
      toast.error(t('noTemplatesSelected'));
      return;
    }

    try {
      const templatesToExport = templates.filter((t) =>
        selectedTemplates.has(t.mail_id || t.id)
      );

      const exportData = await Promise.all(
        templatesToExport.map(async (template) => {
          const allTranslations = await Promise.all(
            locales.map(async (locale) => {
              try {
                const { data } = await request<Mail>({
                  url: `/mail/${template.mail_id || template.id}?locale=${locale.code}`,
                  method: 'GET',
                });
                return {
                  code: locale.code,
                  subject: data.subject,
                  body: data.body,
                };
              } catch {
                return null;
              }
            })
          );

          const validTranslations = allTranslations.filter(
            (t) => t !== null && t.subject && t.body
          );

          return {
            slug: template.slug,
            translations: validTranslations,
            variables: template.mail_var.map((v) => v.name),
          };
        })
      );

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mail-templates-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('exportSuccess'));
    } catch (error) {
      console.error('Error exporting templates:', error);
      toast.error(t('exportError'));
    }
  };

  const handleDownloadHTML = async (template: Mail) => {
    try {
      const response = await request({
        url: `/mail/${template.mail_id || template.id}/html?locale=${template.locale.code}`,
        method: 'GET',
      });

      const htmlContent =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.slug}-${template.locale.code}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('htmlDownloadSuccess'));
    } catch (error) {
      console.error('Error downloading HTML:', error);
      toast.error(t('htmlDownloadError'));
    }
  };

  const downloadYAML = async (template: Mail) => {
    try {
      const allTranslations = await Promise.all(
        locales.map(async (locale) => {
          try {
            const { data } = await request<Mail>({
              url: `/mail/${template.mail_id || template.id}?locale=${locale.code}`,
              method: 'GET',
            });
            return {
              code: locale.code,
              subject: data.subject,
              body: data.body,
            };
          } catch {
            return null;
          }
        })
      );

      const validTranslations = allTranslations.filter(
        (t) => t !== null && t.subject && t.body
      );

      let yaml = `- slug: ${template.slug}\n`;
      if (validTranslations.length > 0) {
        yaml += '  subject:\n';
        validTranslations.forEach((translation) => {
          yaml += `    ${translation?.code}: ${translation?.subject}\n`;
        });
      }

      if (validTranslations.length > 0) {
        yaml += '  body:\n';
        validTranslations.forEach((translation) => {
          yaml += `    ${translation?.code}: |\n`;
          const bodyLines = translation?.body.split('\n');
          bodyLines?.forEach((line) => {
            yaml += `      ${line}\n`;
          });
        });
      }

      if (formData.variables.length > 0) {
        yaml += '  relations:\n';
        yaml += '    mail_var:\n';
        formData.variables.forEach((v) => {
          yaml += `      - name: ${v}\n`;
        });
      }

      const blob = new Blob([yaml], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.slug}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading YAML:', error);
      toast.error(t('yamlDownloadError'));
    }
  };

  const replaceVariablesInHTML = (html: string) => {
    let result = html;
    Object.entries(variableTestValues).forEach(([variable, value]) => {
      if (value) {
        const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g');
        result = result.replace(regex, value);
      }
    });
    return result;
  };

  const renderHTMLPreview = (html: string) => {
    const processedHtml = replaceVariablesInHTML(html);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            a {
              color: #0066cc;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          ${processedHtml}
        </body>
      </html>
    `;
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        setImportFile(file);
        await processImportFile(file, false);
      }
    };
    input.click();
  };

  const processImportFile = async (file: File, overwrite: boolean = false) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await request<ImportResponse>({
        url: '/mail/import',
        method: 'POST',
        data: {
          data,
          overwrite,
        },
      });

      if (response.data?.conflicts && response.data.conflicts.length > 0) {
        setConflictingSlugs(response.data.conflicts);
        setIsConflictDialogOpen(true);
      } else {
        toast.success(t('importSuccess'));
        refetch();
        setImportFile(null);
      }
    } catch (error: any) {
      console.error('Error importing templates:', error);
      const message = error?.response?.data?.message || t('importError');
      toast.error(message);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (importFile) {
      setIsConflictDialogOpen(false);
      await processImportFile(importFile, true);
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumbHome'), href: '/' },
          { label: t('breadcrumbTitle') },
        ]}
        actions={[
          ...(selectedTemplates.size > 0
            ? [
                {
                  label: t('exportSelected'),
                  onClick: handleExportSelected,
                  variant: 'outline' as const,
                },
              ]
            : []),
          {
            label: t('import'),
            onClick: handleImportClick,
            variant: 'outline' as const,
          },
          {
            label: t('newTemplate'),
            onClick: () => handleCreate(),
            variant: 'default' as const,
          },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <SearchBar
        searchQuery={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onSearch={() => setPage(1)}
        placeholder={t('searchPlaceholder')}
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<MailIcon className="h-12 w-12" />}
          title={t('noTemplatesFound')}
          description={t('noTemplatesHint')}
          actionLabel={t('newTemplate')}
          onAction={handleCreate}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedTemplates.size === templates.length &&
                      templates.length > 0
                    }
                    onCheckedChange={handleToggleAll}
                  />
                </TableHead>
                <TableHead>{t('tableSlug')}</TableHead>
                <TableHead>{t('tableSubject')}</TableHead>
                <TableHead>{t('tableVariables')}</TableHead>
                <TableHead>{t('tableUpdated')}</TableHead>
                <TableHead className="text-right">
                  {t('tableActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.id}
                  onDoubleClick={() => handleEdit(template)}
                  className="cursor-pointer"
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTemplates.has(
                        template.mail_id || template.id
                      )}
                      onCheckedChange={() =>
                        handleToggleTemplate(template.mail_id || template.id)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {template.slug}
                  </TableCell>
                  <TableCell>{template.subject}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.mail_var.map((v, index) => (
                        <Badge
                          key={`${template.id}-${v.id}-${index}`}
                          variant="secondary"
                          className="text-xs"
                        >
                          {v.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(
                      template.updated_at,
                      getSettingValue,
                      currentLocaleCode
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadHTML(template);
                        }}
                        title={t('downloadHTML')}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(Number(template.mail_id || template.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationFooter
        currentPage={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ResizableSheetContent sheetId="mail-template-editor" defaultWidth={1152}>
          <SheetHeader>
            <SheetTitle>
              {editMode ? t('editTemplate') : t('newTemplateTitle')}
            </SheetTitle>
            <SheetDescription>
              {editMode
                ? t('editTemplateDescription')
                : t('newTemplateDescription')}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">{t('slugLabel')}</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder={t('slugPlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">{t('subjectLabel')}</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder={t('subjectPlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="variables">{t('variablesLabel')}</Label>
                  <TagsInput
                    id="variables"
                    value={formData.variables}
                    onChange={(val) =>
                      setFormData({ ...formData, variables: val })
                    }
                    placeholder={t('variablesPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('variablesHelp')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">{t('bodyLabel')}</Label>
                  <RichTextEditor
                    key={selectedLocaleCode}
                    value={formData.body}
                    onChange={(value) =>
                      setFormData({ ...formData, body: value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="absolute top-4 right-8 space-y-2">
                  <Label htmlFor="locale-select">{t('localeLabel')}</Label>
                  <Select
                    value={selectedLocaleCode}
                    onValueChange={handleLocaleChange}
                  >
                    <SelectTrigger id="locale-select" className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map((locale) => (
                        <SelectItem key={locale.code} value={locale.code}>
                          {locale.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('preview')}</Label>
                  <div className="rounded-lg border bg-white overflow-auto max-h-[calc(90vh-280px)]">
                    <iframe
                      srcDoc={renderHTMLPreview(formData.body)}
                      className="w-full min-h-125 border-0"
                      title="Email Preview"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                </div>

                {formData.variables.length > 0 && (
                  <div className="mt-4">
                    <h4 className="mb-2 text-sm font-semibold">
                      {t('availableVariables')}
                    </h4>
                    <div className="space-y-2 grid grid-cols-2">
                      {formData.variables.map((v, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="font-mono min-w-30"
                          >
                            {'{{' + v + '}}'}
                          </Badge>
                          <Input
                            placeholder={t('testValuePlaceholder')}
                            value={variableTestValues[v] || ''}
                            onChange={(e) =>
                              setVariableTestValues({
                                ...variableTestValues,
                                [v]: e.target.value,
                              })
                            }
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedTemplate) {
                      downloadYAML(selectedTemplate);
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('downloadYAML')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMigration}
                >
                  <Database className="mr-2 h-4 w-4" />
                  {t('generateMigration')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestEmail}
                >
                  <MailIcon className="mr-2 h-4 w-4" />
                  {t('sendTestEmail')}
                </Button>
              </div>
              <Button type="submit" className="min-w-40">
                {editMode ? t('saveChanges') : t('createTemplate')}
              </Button>
            </div>
          </form>
        </ResizableSheetContent>
      </Sheet>

      <Dialog
        open={isTestEmailDialogOpen}
        onOpenChange={setIsTestEmailDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('sendTestEmailTitle')}</DialogTitle>
            <DialogDescription>
              {t('sendTestEmailDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="test-email-recipient">
                {t('recipientLabel')}
              </Label>
              <Input
                id="test-email-recipient"
                type="email"
                placeholder={t('recipientPlaceholder')}
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                required
              />
            </div>

            {formData.variables.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  {t('variableValuesTitle')}
                </h4>
                <div className="space-y-2">
                  {formData.variables.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono min-w-30"
                      >
                        {'{{' + v + '}}'}
                      </Badge>
                      <Input
                        placeholder={t('variableValuePlaceholder')}
                        value={testEmailVariableValues[v] || ''}
                        onChange={(e) =>
                          setTestEmailVariableValues({
                            ...testEmailVariableValues,
                            [v]: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('emailPreview')}</Label>
              <div className="rounded-lg border bg-white overflow-hidden max-h-100">
                <iframe
                  srcDoc={renderHTMLPreview(
                    Object.entries(testEmailVariableValues).reduce(
                      (html, [variable, value]) => {
                        if (value) {
                          const regex = new RegExp(
                            `{{\\s*${variable}\\s*}}`,
                            'g'
                          );
                          return html.replace(regex, value);
                        }
                        return html;
                      },
                      formData.body
                    )
                  )}
                  className="w-full min-h-100 border-0"
                  title="Email Test Preview"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTestEmailDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSendTestEmail}
              disabled={!testEmailRecipient}
            >
              <MailIcon className="mr-2 h-4 w-4" />
              {t('sendEmail')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isConflictDialogOpen}
        onOpenChange={setIsConflictDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('importConflictTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('importConflictDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">{t('conflictingSlugs')}:</p>
            <div className="space-y-1">
              {conflictingSlugs.map((slug, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="destructive" className="font-mono text-xs">
                    {slug}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsConflictDialogOpen(false);
                setImportFile(null);
                setConflictingSlugs([]);
              }}
            >
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmOverwrite}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {t('overwrite')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
