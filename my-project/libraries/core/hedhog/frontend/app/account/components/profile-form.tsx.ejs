'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Input } from '@/components/ui/input';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formatDateTime } from '@/lib/format-date';
import { getPhotoUrl } from '@/lib/get-photo-url';
import { User as UserType } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import { Loader, Upload, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

type ProfileDraftPayload = {
  values: {
    name: string;
  };
};

const PROFILE_FORM_DRAFT_STORAGE_KEY = 'core-profile-form-draft';

export function ProfileForm() {
  const {
    user,
    request,
    showToastHandler,
    refetchUser,
    currentLocaleCode,
    getSettingValue,
  } = useApp();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('core.ProfileForm');

  const profileSchema = z.object({
    name: z.string().min(2, t('errorName')),
  });

  type ProfileFormValues = z.infer<typeof profileSchema>;

  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await request<UserType>({
        url: `/profile`,
      });
      return response.data;
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || '',
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
  } = useFormDraft<ProfileDraftPayload>({
    storageKey: PROFILE_FORM_DRAFT_STORAGE_KEY,
    value: {
      values: {
        name: watchedValues.name ?? '',
      },
    },
    hasData:
      (watchedValues.name ?? '').trim().length > 0 &&
      (watchedValues.name ?? '').trim() !==
        (profile?.name ?? user?.name ?? '').trim(),
    enabled: true,
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

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await request({
        url: `/profile`,
        method: 'PUT',
        data,
      });
      clearDraft();
      showToastHandler('success', t('updatedSuccess'));
    } catch {
      showToastHandler('error', t('updateFailure'));
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToastHandler('error', t('invalidImageType'));
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToastHandler('error', t('imageTooLarge'));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await request({
        url: `/profile/avatar`,
        method: 'PUT',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToastHandler('success', t('avatarUpdateSuccess'));
      refetchUser();
      refetch();
    } catch {
      showToastHandler('error', t('avatarUpdateFailure'));
    } finally {
      setUploading(false);
    }
  };

  const userInitials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  useEffect(() => {
    if (!profile) {
      return;
    }

    const storedDraft = loadDraft();

    form.reset(
      storedDraft?.payload.values ?? {
        name: profile.name,
      }
    );
  }, [form, loadDraft, profile]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="size-24">
              <AvatarImage
                src={getPhotoUrl(profile?.photo_id)}
                alt={profile?.name || t('avatarAlt')}
              />
              <AvatarFallback className="text-2xl">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Loader className="animate-spin h-8 w-8 text-white" />
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 size-4" />
              {uploading ? t('uploading') : t('changeAvatar')}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('avatarGuidelines')}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('formNameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('formNamePlaceholder')} {...field} />
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
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || isLoading}
            >
              <User className="mr-2 size-4" />
              {t('saveChanges')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
