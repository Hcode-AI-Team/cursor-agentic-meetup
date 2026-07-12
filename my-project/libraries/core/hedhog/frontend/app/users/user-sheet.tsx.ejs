'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { Input } from '@/components/ui/input';
import {
  formatIntegrationProviderName,
  IntegrationLogo,
  normalizeIntegrationProvider,
  resolveOAuthProvider,
} from '@/components/ui/integration-logo';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formatDateTime } from '@/lib/format-date';
import { getPhotoUrl } from '@/lib/get-photo-url';
import { getUserEmail } from '@/lib/get-user-email';
import { User, UserMfa } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import {
  Activity,
  Camera,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  KeyRound,
  LogOut,
  LucideIcon,
  Mail,
  Monitor,
  ScrollText,
  RefreshCcw,
  Save,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCircle,
  UserIcon,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ActiveSessions } from './active-session';
import { UserIdentifiersSection } from './identifiers';
import { PermissionsSection } from './permissions';
import { UserLogs } from './user-logs';

export type UserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number | null;
  onSuccess?: () => void;
};

type UserCreateDraftPayload = {
  values: {
    name: string;
    email: string;
  };
};

type UserEditDraftPayload = {
  userId: number | null;
  values: {
    name: string;
    email: string;
  };
};

const USER_CREATE_DRAFT_STORAGE_KEY = 'core-user-create-draft';

const OAUTH_PROVIDER_TOGGLE_MAP: Array<{
  settingSlug: string;
  provider: {
    id: string;
    slug: string;
    name: string;
  };
}> = [
  {
    settingSlug: 'oauth-facebook-enabled',
    provider: { id: 'facebook', slug: 'facebook-oauth', name: 'Facebook' },
  },
  {
    settingSlug: 'oauth-github-enabled',
    provider: { id: 'github', slug: 'github-oauth', name: 'GitHub' },
  },
  {
    settingSlug: 'oauth-google-enabled',
    provider: { id: 'google', slug: 'google-oauth', name: 'Google' },
  },
  {
    settingSlug: 'oauth-microsoft-enabled',
    provider: {
      id: 'microsoft',
      slug: 'microsoft-oauth',
      name: 'Microsoft',
    },
  },
  {
    settingSlug: 'oauth-microsoft-entra-id-enabled',
    provider: {
      id: 'microsoft-entra-id',
      slug: 'microsoft-entra-id-oauth',
      name: 'Microsoft Entra ID',
    },
  },
  {
    settingSlug: 'oauth-apple-enabled',
    provider: { id: 'apple', slug: 'apple-oauth', name: 'Apple' },
  },
  {
    settingSlug: 'oauth-linkedin-enabled',
    provider: { id: 'linkedin', slug: 'linkedin-oauth', name: 'LinkedIn' },
  },
];

function generateRandomPassword(length = 16) {
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '@#$%&*!?-_+';
  const allChars = `${lowercase}${uppercase}${numbers}${symbols}`;

  const groups = [lowercase, uppercase, numbers, symbols];
  const randomValues = new Uint32Array(length + groups.length);
  globalThis.crypto.getRandomValues(randomValues);

  const chars: string[] = [];

  groups.forEach((group, index) => {
    const randomValue = randomValues[index] ?? 0;
    chars.push(group.charAt(randomValue % group.length));
  });

  for (let i = groups.length; i < randomValues.length; i++) {
    const randomValue = randomValues[i] ?? 0;
    chars.push(allChars.charAt(randomValue % allChars.length));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const randomValue = randomValues[i] ?? 0;
    const j = randomValue % (i + 1);
    const currentChar = chars[i]!;
    const swapChar = chars[j]!;
    chars[i] = swapChar;
    chars[j] = currentChar;
  }

  return chars.slice(0, length).join('');
}

// ─── Create Sheet ────────────────────────────────────────────────────────────

function UserCreateSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const t = useTranslations('core.UserPage');
  const { request, currentLocaleCode, getSettingValue } = useApp();
  const minPasswordLength = Number(getSettingValue('password-min-length')) || 6;

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addUserSchema = z.object({
    name: z.string().min(2, t('errorName')),
    email: z.string().email(t('errorEmail')),
    password: z
      .string()
      .min(minPasswordLength, t('errorPassword'))
      .optional()
      .or(z.literal('')),
  });

  const form = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const watchedValues = useWatch({ control: form.control });

  const {
    clearDraft,
    loadDraft,
    hasDraft,
    savedAt: draftSavedAt,
  } = useFormDraft<UserCreateDraftPayload>({
    storageKey: USER_CREATE_DRAFT_STORAGE_KEY,
    value: {
      values: {
        name: watchedValues.name ?? '',
        email: watchedValues.email ?? '',
      },
    },
    hasData: Boolean(
      (watchedValues.name ?? '').trim() || (watchedValues.email ?? '').trim()
    ),
    enabled: open,
  });

  const draftStatusContent = useMemo(() => {
    if (!hasDraft || !draftSavedAt) return null;
    const savedDate = new Date(draftSavedAt);
    if (Number.isNaN(savedDate.getTime())) return null;
    const locale = currentLocaleCode === 'en' ? enUS : ptBR;
    const relativeLabel = formatDistanceToNow(savedDate, {
      addSuffix: true,
      locale,
    });
    const absoluteLabel = formatDateTime(
      savedDate,
      getSettingValue,
      currentLocaleCode
    );
    return t('draftStatus', { relativeLabel, absoluteLabel });
  }, [draftSavedAt, currentLocaleCode, getSettingValue, hasDraft, t]);

  useEffect(() => {
    if (!open) return;
    const storedDraft = loadDraft();
    form.reset({
      name: storedDraft?.payload.values.name ?? '',
      email: storedDraft?.payload.values.email ?? '',
      password: '',
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: z.infer<typeof addUserSchema>) => {
    try {
      await request({ url: '/user', method: 'POST', data: values });
      clearDraft();
      form.reset();
      onOpenChange(false);
      setFormError(null);
      onSuccess?.();
    } catch (err) {
      const e: any = err;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        t('serverError');
      setFormError(String(msg));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent
        sheetId="core-users-create-sheet"
        defaultWidth={560}
        minWidth={420}
        maxWidth={920}
        className="w-full sm:max-w-lg overflow-y-auto gap-0"
      >
        <SheetHeader>
          <SheetTitle>{t('dialogAddUserTitle')}</SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>
        <div className="w-full border-t pt-1 mt-1" />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-4 gap-4 w-full flex flex-col pt-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('formNameLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('formEmailLabel')}</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('formPasswordLabel')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        {...field}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded p-1 text-sm text-muted-foreground hover:bg-muted/50"
                        aria-label={
                          showPassword ? t('hidePassword') : t('showPassword')
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <Alert
                variant="destructive"
                className="border-red-300 bg-red-50 rounded-md p-4"
              >
                <AlertTitle className="text-sm">
                  {t('verifyYourInput')}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {formError}
                </AlertDescription>
              </Alert>
            )}

            <FormActions
              sheet
              statusContent={draftStatusContent}
              submitLabel={t('buttonAddUser')}
              submitType="submit"
              sheetClassName="px-0 pb-0"
            />
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

function UserEditSheet({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  onSuccess?: () => void;
}) {
  const t = useTranslations('core.UserPage');
  const userActivityT = useTranslations('core.UserActivity');
  const { request, currentLocaleCode, getSettingValue } = useApp();
  const minPasswordLength = Number(getSettingValue('password-min-length')) || 6;
  const enabledOAuthProviders = useMemo(
    () =>
      OAUTH_PROVIDER_TOGGLE_MAP.filter(
        ({ settingSlug }) => getSettingValue(settingSlug) === true
      ).map(({ provider }) => provider),
    [getSettingValue]
  );

  const [activeTab, setActiveTab] = useState('overview');
  const prevUserIdRef = useRef<number | null>(null);
  const [photo, setPhoto] = useState<number | null | undefined>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [resetFormError, setResetFormError] = useState<string | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false);
  const [isResetResultDialogOpen, setIsResetResultDialogOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetPasswordResult, setShowResetPasswordResult] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState('');
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const {
    data: editingUser,
    isLoading,
    refetch: refetchUser,
  } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await request<User>({
        url: `/user/${userId}`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: open && !!userId,
  });

  const editUserSchema = z.object({
    name: z.string().min(2, t('errorName')),
    email: z.string().email(t('errorEmail')),
  });

  const editForm = useForm({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: '', email: '' },
  });

  const resetPasswordSchema = z.object({
    password: z.string().min(minPasswordLength, t('errorPassword')),
  });

  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const passwordCredential = useMemo(() => {
    const credentials = (editingUser as any)?.user_credential;
    if (!Array.isArray(credentials) || credentials.length === 0) return null;

    return (
      credentials.find(
        (credential) =>
          String(credential?.type ?? '').toLowerCase() === 'password'
      ) ?? credentials[0]
    );
  }, [editingUser]);

  const passwordLastChangedStatus = useMemo(() => {
    const changedAt =
      passwordCredential?.updated_at ?? passwordCredential?.created_at ?? null;
    if (!changedAt) return null;

    const changedDate = new Date(changedAt);
    if (Number.isNaN(changedDate.getTime())) return null;

    const locale = currentLocaleCode === 'en' ? enUS : ptBR;

    return {
      relativeLabel: formatDistanceToNow(changedDate, {
        addSuffix: true,
        locale,
      }),
      absoluteLabel: formatDateTime(
        changedDate,
        getSettingValue,
        currentLocaleCode
      ),
    };
  }, [currentLocaleCode, getSettingValue, passwordCredential]);

  const watchedEditValues = useWatch({ control: editForm.control });

  const editDraftStorageKey = `core-user-edit-draft-${userId}`;

  const {
    clearDraft: clearEditDraft,
    loadDraft: loadEditDraft,
    hasDraft: hasEditDraft,
    savedAt: editDraftSavedAt,
  } = useFormDraft<UserEditDraftPayload>({
    storageKey: editDraftStorageKey,
    value: {
      userId: userId ?? null,
      values: {
        name: watchedEditValues.name ?? '',
        email: watchedEditValues.email ?? '',
      },
    },
    hasData: Boolean(
      (watchedEditValues.name ?? '').trim() ||
      (watchedEditValues.email ?? '').trim()
    ),
    enabled: open && !!editingUser,
  });

  const editDraftStatusContent = useMemo(() => {
    if (!hasEditDraft || !editDraftSavedAt) return null;
    const savedDate = new Date(editDraftSavedAt);
    if (Number.isNaN(savedDate.getTime())) return null;
    const locale = currentLocaleCode === 'en' ? enUS : ptBR;
    const relativeLabel = formatDistanceToNow(savedDate, {
      addSuffix: true,
      locale,
    });
    const absoluteLabel = formatDateTime(
      savedDate,
      getSettingValue,
      currentLocaleCode
    );
    return t('draftStatus', { relativeLabel, absoluteLabel });
  }, [editDraftSavedAt, currentLocaleCode, getSettingValue, hasEditDraft, t]);

  useEffect(() => {
    if (!editingUser) return;
    const storedDraft = loadEditDraft();
    const shouldRestoreDraft =
      storedDraft?.payload.userId === Number(editingUser.id);
    editForm.reset(
      shouldRestoreDraft
        ? storedDraft.payload.values
        : {
            name: editingUser.name || '',
            email: getUserEmail(editingUser),
          }
    );
    if (prevUserIdRef.current !== Number(editingUser.id)) {
      setActiveTab('overview');
      prevUserIdRef.current = Number(editingUser.id);
    }
  }, [editingUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = (open: boolean) => {
    if (!open) {
      setPhoto(null);
      setIsResetPasswordDialogOpen(false);
      setIsResetResultDialogOpen(false);
      setResetPasswordResult('');
      prevUserIdRef.current = null;
    }
    onOpenChange(open);
  };

  const handleRefreshUser = async () => {
    await refetchUser();
  };

  const onEditSubmit = async (values: z.infer<typeof editUserSchema>) => {
    try {
      await request({
        url: `/user/${userId}`,
        method: 'PATCH',
        data: values,
      });
      clearEditDraft();
      await refetchUser();
      setEditFormError(null);
      toast.success(t('userUpdatedSuccess'));
      onSuccess?.();
    } catch (err) {
      const e: any = err;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        t('serverError');
      setEditFormError(String(msg));
    }
  };

  const onDelete = async () => {
    try {
      await request({
        url: `/user`,
        method: 'DELETE',
        data: { ids: [Number(userId)] },
      });
      setOpenDeleteModal(false);
      handleClose(false);
      toast.success(t('userDeletedSuccess'));
      onSuccess?.();
    } catch (err) {
      const e: any = err;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        t('serverError');
      setEditFormError(String(msg));
    }
  };

  const openResetPasswordDialog = () => {
    const generatedPassword = generateRandomPassword();
    resetPasswordForm.reset({ password: generatedPassword });
    setResetFormError(null);
    setShowResetPassword(false);
    setIsResetPasswordDialogOpen(true);
  };

  const onResetPasswordSubmit = async () => {
    setIsResettingPassword(true);
    setResetFormError(null);
    try {
      const { password } = resetPasswordForm.getValues();
      const response = await request<{ password: string }>({
        url: `/user/${userId}/reset-password`,
        method: 'PATCH',
        data: { password },
      });
      setResetPasswordResult(response.data.password);
      setIsResetPasswordDialogOpen(false);
      setIsResetResultDialogOpen(true);
      await refetchUser();
      toast.success(t('passwordResetSuccess'));
    } catch (err) {
      const e: any = err;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        t('serverError');
      setResetFormError(String(msg));
    } finally {
      setIsResettingPassword(false);
    }
  };

  const copyResetPassword = async () => {
    try {
      await navigator.clipboard.writeText(resetPasswordResult);
      toast.success(t('passwordCopied'));
    } catch {
      toast.error(t('passwordCopyError'));
    }
  };

  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        setIsUploadingAvatar(true);
        try {
          const formData = new FormData();
          formData.append('avatar', file);
          const response: any = await request({
            url: `/user/${userId}/avatar`,
            method: 'POST',
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setPhoto(response.data.id);
          toast.success(t('pictureUpdatedSuccess'));
          await refetchUser();
          onSuccess?.();
        } catch (err) {
          console.error(err);
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    };
    input.click();
  };

  if (!open) return null;

  if (isLoading || !editingUser) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <ResizableSheetContent
          sheetId="core-users-edit-sheet"
          defaultWidth={960}
          minWidth={700}
          maxWidth={1400}
          className="w-full sm:max-w-4xl overflow-y-auto gap-0"
        >
          <SheetHeader>
            <SheetTitle>{t('titleEditUser')}</SheetTitle>
            <SheetDescription>{t('description')}</SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-center h-40">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </ResizableSheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <ResizableSheetContent
        sheetId="core-users-edit-sheet"
        defaultWidth={960}
        minWidth={700}
        maxWidth={1400}
        className="w-full sm:max-w-4xl overflow-y-auto gap-0"
      >
        <SheetHeader>
          <SheetTitle>{t('titleEditUser')}</SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
            <TabsList className="flex-wrap overflow-visible px-2 py-1.5">
              <TabsTrigger value="overview">
                <UserCircle className="h-4 w-4" />
                <span>{t('tabOverview')}</span>
              </TabsTrigger>
              <TabsTrigger value="edit">
                <Save className="h-4 w-4" />
                <span>{t('tabEdit')}</span>
              </TabsTrigger>
              <TabsTrigger value="credentials">
                <Key className="h-4 w-4" />
                <span>{t('tabCredentials')}</span>
              </TabsTrigger>
              <TabsTrigger value="identifiers">
                <Fingerprint className="h-4 w-4" />
                <span>{t('tabIdentifiers')}</span>
              </TabsTrigger>
              <TabsTrigger value="permissions">
                <ShieldCheck className="h-4 w-4" />
                <span>{t('tabPermissions')}</span>
              </TabsTrigger>
              <TabsTrigger value="mfa">
                <Shield className="h-4 w-4" />
                <span>{t('tabMfa')}</span>
              </TabsTrigger>
              <TabsTrigger value="sessions">
                <Monitor className="h-4 w-4" />
                <span>{t('tabSessions')}</span>
              </TabsTrigger>
              <TabsTrigger value="logs">
                <ScrollText className="h-4 w-4" />
                <span>{t('tabLogs')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4 p-4 pt-0">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative group">
                <Avatar className="h-24 w-24 shadow-md">
                  <AvatarImage
                    src={getPhotoUrl(photo || editingUser.photo_id)}
                    alt={editingUser.name}
                    className="object-cover h-24 w-24 rounded-full"
                  />
                  <AvatarFallback className="text-2xl font-semibold bg-linear-to-br from-purple-500 to-pink-500 text-white">
                    {editingUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUploadingAvatar ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <div className="absolute -bottom-1 -right-1">
                  {editingUser.suspended_until ? (
                    <div className="rounded-full bg-rose-500 p-1.5 shadow-md">
                      <ShieldCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="rounded-full bg-green-500 p-1.5 shadow-md">
                      <Users className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center space-y-0.5">
                <h3 className="text-xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {editingUser.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                  <Mail className="h-4 w-4" />
                  {getUserEmail(editingUser)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Card
                className={`border-l-4 ${editingUser.suspended_until ? 'border-l-red-500' : 'border-l-green-500'} py-2`}
              >
                <CardHeader className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardDescription className="text-xs">
                        {t('status')}
                      </CardDescription>
                      <CardTitle className="text-sm">
                        {editingUser.suspended_until ? (
                          <span className="text-rose-600">{t('blocked')}</span>
                        ) : (
                          <span className="text-green-600">{t('active')}</span>
                        )}
                      </CardTitle>
                    </div>
                    <div
                      className={`rounded-full p-1 ${editingUser.suspended_until ? 'bg-rose-100' : 'bg-green-100'}`}
                    >
                      <Activity
                        className={`h-6 w-6 ${editingUser.suspended_until ? 'text-rose-600' : 'text-green-600'}`}
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-l-4 border-l-primary-500 py-2">
                <CardHeader className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardDescription className="text-xs">
                        {t('cardLastLoginDescription')}
                      </CardDescription>
                      {Boolean(editingUser.user_session?.length) ? (
                        <CardTitle className="text-sm truncate">
                          {editingUser.user_session?.[0]?.created_at &&
                            formatDistanceToNow(
                              new Date(
                                editingUser.user_session?.[0]?.created_at
                              ),
                              {
                                addSuffix: true,
                                locale:
                                  currentLocaleCode === 'en' ? enUS : ptBR,
                              }
                            )}
                          <small className="text-xs ml-2 text-muted-foreground">
                            {formatDateTime(
                              String(editingUser.user_session?.[0]?.created_at),
                              getSettingValue,
                              currentLocaleCode
                            )}
                          </small>
                        </CardTitle>
                      ) : (
                        <CardTitle>{t('cardLastLoginTitle')}</CardTitle>
                      )}
                    </div>
                    <div className="rounded-full bg-primary-100 p-1">
                      <Clock className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t('securityTitle')}
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Card className="border-l-4 border-l-amber-500 py-2">
                  <CardHeader className="p-2">
                    <div className="flex flex-col items-center text-center">
                      <div className="rounded-full bg-amber-100 p-1 mb-1">
                        <Shield className="h-4 w-4 text-amber-600" />
                      </div>
                      <CardDescription className="text-xs">
                        {t('securityDescription')}
                      </CardDescription>
                      <CardTitle className="text-sm font-bold">
                        {editingUser.user_mfa &&
                        editingUser.user_mfa.length > 0 ? (
                          <span className="text-amber-600">
                            {t('securityLevelHight')}
                          </span>
                        ) : (
                          <span className="text-orange-600">
                            {t('securityLevelMedium')}
                          </span>
                        )}
                      </CardTitle>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-l-4 border-l-purple-500 py-2">
                  <CardHeader className="p-2">
                    <div className="flex flex-col items-center text-center">
                      <div className="rounded-full bg-purple-100 p-1 mb-1">
                        <Shield className="h-4 w-4 text-purple-600" />
                      </div>
                      <CardDescription className="text-xs">
                        {t('cardMfaMethods')}
                      </CardDescription>
                      <CardTitle className="text-sm font-bold text-purple-600">
                        {editingUser.user_mfa?.length || 0}
                      </CardTitle>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-l-4 border-l-blue-500 py-2">
                  <CardHeader className="p-2">
                    <div className="flex flex-col items-center text-center">
                      <div className="rounded-full bg-blue-100 p-1 mb-1">
                        <Fingerprint className="h-4 w-4 text-blue-600" />
                      </div>
                      <CardDescription className="text-xs">
                        {t('cardUserId')}
                      </CardDescription>
                      <CardTitle className="text-xs font-bold text-blue-600">
                        #{editingUser.id}
                      </CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {editingUser.suspended_until && (
              <Card className="border-rose-200 bg-rose-50/50">
                <CardHeader className="p-2">
                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-rose-100 p-1">
                      <ShieldCheck className="h-3 w-3 text-rose-600" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-rose-900">
                          {t('accountSuspended')}
                        </p>
                        <p className="text-xs text-rose-700 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {t('until')}: {editingUser.suspended_until}
                        </p>
                      </div>
                      {editingUser.suspended_reason && (
                        <div className="rounded-md bg-rose-100 p-2">
                          <p className="text-xs font-medium text-rose-900">
                            {t('reason')}
                          </p>
                          <p className="text-xs text-rose-700">
                            {editingUser.suspended_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t('recentActivityTitle')}
                </h4>
              </div>

              <Card className="rounded-md p-0">
                <CardContent className="p-4 gap-2 flex flex-col">
                  {editingUser.user_activity?.length ? (
                    <div className="space-y-3">
                      {editingUser.user_activity
                        ?.slice(0, 5)
                        .map((activity, index) => {
                          const actionIcons: Record<string, LucideIcon> = {
                            login: UserIcon,
                            forgotPassword: KeyRound,
                            logout: LogOut,
                            resetPassword: RefreshCcw,
                            revokeAllSessions: ShieldOff,
                            revokeSession: Shield,
                          };
                          const Icon = actionIcons[activity.action] || UserIcon;

                          return (
                            <div
                              key={index}
                              className="flex items-start gap-3 border-b pb-3 last:border-none"
                            >
                              <div className="rounded-md bg-blue-50 p-2">
                                <Icon className="w-4 h-4 text-gray-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {userActivityT(activity.action)}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-1">
                                  {activity.created_at &&
                                    formatDistanceToNow(
                                      new Date(activity.created_at),
                                      {
                                        addSuffix: true,
                                        locale:
                                          currentLocaleCode === 'en'
                                            ? enUS
                                            : ptBR,
                                      }
                                    )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t('noRecentActivity')}
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button
                className="cursor-pointer"
                variant="destructive"
                onClick={() => setOpenDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('buttonDeleteUser')}</span>
              </Button>
            </div>

            <AlertDialog
              open={openDeleteModal}
              onOpenChange={setOpenDeleteModal}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('dialogDeleteUserTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('dialogDeleteUserDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('deleteUserCancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    {t('deleteUserConfirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="space-y-4 mt-4 p-4 pt-0">
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit(onEditSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('editNameLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('editNamePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormActions
                  statusContent={editDraftStatusContent}
                  cancelLabel={t('cancel')}
                  onCancel={() => {
                    clearEditDraft();
                    onOpenChange(false);
                  }}
                  submitLabel={t('saveChanges')}
                  submitType="submit"
                  className="pt-2"
                />
              </form>
            </Form>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4 mt-4 p-4 pt-0">
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <h4 className="text-sm font-semibold">
                  {t('passwordResetTitle')}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('passwordResetDescription')}
                </p>
              </div>
              {passwordLastChangedStatus ? (
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">
                    {t('passwordLastChangedHumanized', {
                      relativeLabel: passwordLastChangedStatus.relativeLabel,
                    })}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t('passwordLastChangedAbsolute', {
                      absoluteLabel: passwordLastChangedStatus.absoluteLabel,
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('passwordLastChangedUnavailable')}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('passwordResetNotice')}
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={openResetPasswordDialog}
                  className="w-full sm:w-fit"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t('buttonResetPassword')}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                {t('connectedAccountsTitle')}
              </h4>
              <div className="space-y-2">
                {enabledOAuthProviders.map((provider) => {
                  const normalizedProviderId = resolveOAuthProvider(
                    provider.id
                  );
                  const isConnected = editingUser.user_account?.some(
                    (account) =>
                      resolveOAuthProvider(
                        normalizeIntegrationProvider(
                          String(account.provider ?? '')
                        )
                      ) === normalizedProviderId
                  );

                  return (
                    <div
                      key={provider.slug}
                      className={`flex items-center justify-between rounded-lg border p-3 ${isConnected ? '' : 'border-dashed'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-slate-50 p-2">
                          <IntegrationLogo
                            provider={provider.slug}
                            size={20}
                            decorative={false}
                            title={provider.name}
                            className={
                              isConnected ? 'opacity-100' : 'opacity-50'
                            }
                          />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${isConnected ? '' : 'text-muted-foreground'}`}
                          >
                            {formatIntegrationProviderName(
                              provider.slug,
                              provider.name
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isConnected ? t('connected') : t('notConnected')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {enabledOAuthProviders.length === 0 && (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    {t('noConnectedAccounts')}
                  </div>
                )}
              </div>
            </div>

            <Sheet
              open={isResetPasswordDialogOpen}
              onOpenChange={(open) => {
                setIsResetPasswordDialogOpen(open);
                if (!open) setResetFormError(null);
              }}
            >
              <ResizableSheetContent
                sheetId="core-users-reset-password-sheet"
                defaultWidth={520}
                minWidth={420}
                maxWidth={760}
                className="w-full sm:max-w-lg overflow-y-auto gap-0"
              >
                <SheetHeader>
                  <SheetTitle>{t('passwordResetDialogTitle')}</SheetTitle>
                  <SheetDescription>
                    {t('passwordResetDialogDescription')}
                  </SheetDescription>
                </SheetHeader>

                <div className="w-full border-t" />

                <Form {...resetPasswordForm}>
                  <form className="flex flex-col gap-4 p-4">
                    <FormField
                      control={resetPasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('passwordResetFieldLabel')}</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="relative">
                                <Input
                                  type={showResetPassword ? 'text' : 'password'}
                                  {...field}
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowResetPassword((s) => !s)
                                  }
                                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded p-1 text-sm text-muted-foreground hover:bg-muted/50"
                                  aria-label={
                                    showResetPassword
                                      ? t('hidePassword')
                                      : t('showPassword')
                                  }
                                >
                                  {showResetPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-fit"
                                onClick={() => {
                                  resetPasswordForm.setValue(
                                    'password',
                                    generateRandomPassword(),
                                    {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    }
                                  );
                                }}
                              >
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                {t('buttonRegeneratePassword')}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {resetFormError && (
                      <Alert variant="destructive">
                        <AlertTitle>{t('verifyYourInput')}</AlertTitle>
                        <AlertDescription>{resetFormError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="mt-auto flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsResetPasswordDialogOpen(false)}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        type="button"
                        disabled={isResettingPassword}
                        onClick={async () => {
                          const valid = await resetPasswordForm.trigger();
                          if (!valid) return;
                          await onResetPasswordSubmit();
                        }}
                      >
                        {isResettingPassword
                          ? t('passwordResetSubmitting')
                          : t('passwordResetConfirm')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </ResizableSheetContent>
            </Sheet>

            <AlertDialog
              open={isResetResultDialogOpen}
              onOpenChange={(open) => {
                setIsResetResultDialogOpen(open);
                if (!open) {
                  setResetPasswordResult('');
                  setShowResetPasswordResult(false);
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('passwordResultTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('passwordResultDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      readOnly
                      value={resetPasswordResult}
                      type={showResetPasswordResult ? 'text' : 'password'}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPasswordResult((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded p-1 text-sm text-muted-foreground hover:bg-muted/50"
                      aria-label={
                        showResetPasswordResult
                          ? t('hidePassword')
                          : t('showPassword')
                      }
                    >
                      {showResetPasswordResult ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyResetPassword}
                    >
                      {t('buttonCopyPassword')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsResetResultDialogOpen(false)}
                    >
                      {t('close')}
                    </Button>
                  </div>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Identifiers Tab */}
          <TabsContent value="identifiers" className="space-y-4 mt-4 p-4 pt-0">
            <UserIdentifiersSection editingUser={editingUser} />
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4 mt-4 p-4 pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {t('permissionsTitle')}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('permissionsDescription')}
                  </p>
                </div>
              </div>
              <PermissionsSection
                userId={editingUser.id!}
                userName={editingUser.name ?? undefined}
                onRoleChange={handleRefreshUser}
              />
            </div>
          </TabsContent>

          {/* MFA Tab */}
          <TabsContent value="mfa" className="space-y-4 mt-4 p-4 pt-0">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('mfaTitle')}</h4>
              {editingUser.user_mfa && editingUser.user_mfa.length > 0 ? (
                <div className="space-y-2">
                  {editingUser.user_mfa.map((mfa: UserMfa) => (
                    <div
                      key={String(mfa.id)}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-amber-50 p-2">
                          <Shield className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{mfa.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('mfaEnabled')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">
                    {t('noMfaEnabled')}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t('enhanceSecurity')}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4 mt-4 p-4 pt-0">
            <ActiveSessions
              editingUser={editingUser}
              refetch={handleRefreshUser}
            />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4 mt-4 p-4 pt-0">
            <UserLogs editingUser={editingUser} />
          </TabsContent>
        </Tabs>
      </ResizableSheetContent>
    </Sheet>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function UserSheet({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: UserSheetProps) {
  if (!open) return null;

  if (userId != null) {
    return (
      <UserEditSheet
        open={open}
        onOpenChange={onOpenChange}
        userId={userId}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <UserCreateSheet
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}
