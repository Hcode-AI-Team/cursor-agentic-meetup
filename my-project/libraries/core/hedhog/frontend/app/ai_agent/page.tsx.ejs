'use client';

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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
  SheetFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';
import { useFormDraft } from '@/hooks/use-form-draft';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { formatDateTime } from '@/lib/format-date';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import { Bot, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type Agent = {
  id: number;
  slug: string;
  provider: 'openai' | 'gemini';
  model: string | null;
  instructions: string | null;
  external_agent_id: string | null;
  created_at: string;
  updated_at: string;
};

type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FormValues = {
  slug: string;
  provider: 'openai' | 'gemini';
  model?: string;
  instructions?: string;
};

type AgentDraftPayload = {
  mode: 'create' | 'edit';
  agentId: number | null;
  values: FormValues;
};

const AI_AGENT_FORM_DRAFT_STORAGE_KEY = 'core-ai-agent-form-draft';

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const record = error as {
      message?: string;
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
    };

    return (
      record.response?.data?.message ||
      record.response?.data?.error ||
      record.message ||
      fallback
    );
  }

  return fallback;
}

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function AiAgentPage() {
  const { request, currentLocaleCode, getSettingValue } = useApp();
  const t = useTranslations('core.AiAgentPage');
  const formSchema = z.object({
    slug: z.string().min(2, t('validationSlugMinLength')),
    provider: z.enum(['openai', 'gemini']),
    model: z.string().optional(),
    instructions: z.string().optional(),
  });
  const { data: generalSettings } = useQuery<{
    data: Array<{ slug: string; value: string }>;
  }>({
    queryKey: ['setting-group-general'],
    queryFn: async () => {
      const response = await request<{
        data: Array<{ slug: string; value: string }>;
      }>({ url: '/setting/group/general', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const pageSizeOptions = useMemo(() => {
    const setting = generalSettings?.data?.find(
      (s) => s.slug === 'pagination-page-sizes'
    );
    if (!setting?.value) return DEFAULT_PAGE_SIZES;
    try {
      const parsed = JSON.parse(setting.value) as string[];
      const sizes = parsed
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);
      return sizes.length > 0 ? sizes : DEFAULT_PAGE_SIZES;
    } catch {
      return DEFAULT_PAGE_SIZES;
    }
  }, [generalSettings]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize({
    storageKey: 'pagination:global:pageSize',
    defaultValue: 12,
    allowedValues: pageSizeOptions,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: '',
      provider: 'openai',
      model: '',
      instructions: '',
    },
  });

  const watchedValues = useWatch({
    control: form.control,
  });

  const {
    clearDraft,
    loadDraft,
    hasDraft,
    savedAt: draftSavedAt,
  } = useFormDraft<AgentDraftPayload>({
    storageKey: AI_AGENT_FORM_DRAFT_STORAGE_KEY,
    value: {
      mode: editingAgent ? 'edit' : 'create',
      agentId: editingAgent?.id ?? null,
      values: {
        slug: watchedValues.slug ?? '',
        provider: watchedValues.provider ?? 'openai',
        model: watchedValues.model ?? '',
        instructions: watchedValues.instructions ?? '',
      },
    },
    hasData: Boolean(
      (watchedValues.slug ?? '').trim() ||
      (watchedValues.model ?? '').trim() ||
      (watchedValues.instructions ?? '').trim() ||
      watchedValues.provider === 'gemini'
    ),
    enabled: isDialogOpen,
  });

  const draftStatusContent = useMemo(() => {
    if (!hasDraft || !draftSavedAt) {
      return null;
    }

    const savedDate = new Date(draftSavedAt);
    if (Number.isNaN(savedDate.getTime())) {
      return null;
    }

    const locale = currentLocaleCode.startsWith('pt') ? ptBR : enUS;
    const relativeLabel = formatDistanceToNow(savedDate, {
      addSuffix: true,
      locale,
    });
    const absoluteLabel = formatDateTime(
      savedDate,
      getSettingValue,
      currentLocaleCode
    );

    return currentLocaleCode.startsWith('pt')
      ? `Rascunho salvo ${relativeLabel} • Último salvamento: ${absoluteLabel}`
      : `Draft saved ${relativeLabel} • Last saved: ${absoluteLabel}`;
  }, [draftSavedAt, currentLocaleCode, getSettingValue, hasDraft]);

  const { data, isLoading, refetch } = useQuery<PaginatedResponse<Agent>>({
    queryKey: ['ai-agents', page, pageSize, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await request<PaginatedResponse<Agent>>({
        url: `/ai/agent?${params.toString()}`,
        method: 'GET',
      });

      return response.data;
    },
  });
  const agentList = data ?? {
    data: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const storedDraft = loadDraft();
    const shouldRestoreEditDraft =
      Boolean(editingAgent) &&
      storedDraft?.payload.mode === 'edit' &&
      storedDraft.payload.agentId === editingAgent?.id;

    if (editingAgent) {
      form.reset(
        shouldRestoreEditDraft
          ? storedDraft.payload.values
          : {
              slug: editingAgent.slug,
              provider: editingAgent.provider,
              model: editingAgent.model || '',
              instructions: editingAgent.instructions || '',
            }
      );
      return;
    }

    form.reset(
      storedDraft?.payload.mode === 'create'
        ? storedDraft.payload.values
        : {
            slug: '',
            provider: 'openai',
            model: '',
            instructions: '',
          }
    );
  }, [editingAgent, form, isDialogOpen, loadDraft]);

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editingAgent) {
        await request({
          url: `/ai/agent/${editingAgent.id}`,
          method: 'PATCH',
          data: {
            slug: values.slug,
            provider: values.provider,
            model: values.model || undefined,
            instructions: values.instructions || undefined,
          },
        });
        toast.success(t('toastUpdatedSuccess'));
      } else {
        await request({
          url: '/ai/agent',
          method: 'POST',
          data: {
            slug: values.slug,
            provider: values.provider,
            model: values.model || undefined,
            instructions: values.instructions || undefined,
          },
        });
        toast.success(t('toastCreatedSuccess'));
      }

      clearDraft();
      setIsDialogOpen(false);
      setEditingAgent(null);
      await refetch();
    } catch (error: unknown) {
      toast.error(String(getErrorMessage(error, t('toastSaveError'))));
    }
  };

  const handleDelete = async () => {
    if (!agentToDelete) return;

    try {
      await request({
        url: '/ai/agent',
        method: 'DELETE',
        data: { ids: [agentToDelete.id] },
      });

      toast.success(t('toastDeletedSuccess'));
      setAgentToDelete(null);
      await refetch();
    } catch (error: unknown) {
      toast.error(String(getErrorMessage(error, t('toastDeleteError'))));
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumbDashboard'), href: '/' },
          { label: t('breadcrumbManagement'), href: '/core/management' },
          { label: t('breadcrumbCurrent') },
        ]}
        title={t('title')}
        description={t('description')}
        actions={[
          {
            label: t('newAgent'),
            onClick: handleOpenCreate,
            icon: <Plus className="h-4 w-4" />,
          },
        ]}
      />

      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        onSearch={() => setPage(1)}
        placeholder={t('searchPlaceholder')}
      />

      {isLoading || agentList.data.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>{t('columnProvider')}</TableHead>
                  <TableHead>{t('columnModel')}</TableHead>
                  <TableHead>{t('columnExternalId')}</TableHead>
                  <TableHead className="text-right">
                    {t('columnActions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>{t('loading')}</TableCell>
                  </TableRow>
                ) : (
                  agentList.data.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>{agent.slug}</TableCell>
                      <TableCell className="uppercase">
                        {agent.provider}
                      </TableCell>
                      <TableCell>{agent.model || '-'}</TableCell>
                      <TableCell>{agent.external_agent_id || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenEdit(agent)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setAgentToDelete(agent)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<Bot className="h-12 w-12" />}
          title={t('empty')}
          description={t('description')}
          actionLabel={t('newAgent')}
          onAction={handleOpenCreate}
        />
      )}

      <PaginationFooter
        currentPage={page}
        pageSize={pageSize}
        totalItems={agentList.total}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        pageSizeOptions={pageSizeOptions}
      />

      <Sheet
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingAgent(null);
          }
        }}
      >
        <ResizableSheetContent
          sheetId="core-ai-agent-form-sheet"
          defaultWidth={640}
          minWidth={460}
          maxWidth={980}
          side="right"
          className="sm:max-w-xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {editingAgent ? t('editTitle') : t('createTitle')}
            </SheetTitle>
            <SheetDescription>{t('dialogDescription')}</SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              className="flex flex-col px-4 gap-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fieldSlug')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('fieldSlugPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fieldProvider')}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t('fieldProviderPlaceholder')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">
                            {t('providerOpenai')}
                          </SelectItem>
                          <SelectItem value="gemini">
                            {t('providerGemini')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fieldModel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('fieldModelPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fieldInstructions')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('fieldInstructionsPlaceholder')}
                        rows={10}
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {draftStatusContent ? (
                <p className="text-xs text-muted-foreground">
                  {draftStatusContent}
                </p>
              ) : null}

              <SheetFooter className="p-0">
                <Button type="submit">
                  <Bot className="h-4 w-4" />
                  {editingAgent ? t('saveChanges') : t('createAgent')}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </ResizableSheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(agentToDelete)}
        onOpenChange={(open) => {
          if (!open) setAgentToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
