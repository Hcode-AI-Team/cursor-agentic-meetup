'use client';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formatDateTime } from '@/lib/format-date';
import { UserIdentifier } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import { CheckCircle2, Mail, ShieldCheck, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

type EmailDraftPayload = {
  values: {
    newEmail: string;
  };
};

const CHANGE_EMAIL_DRAFT_STORAGE_KEY = 'core-change-email-form-draft';

export function ChangeEmailForm() {
  const t = useTranslations('core.ChangeEmailForm');
  const { request, showToastHandler, getSettingValue, currentLocaleCode } =
    useApp();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingData, setPendingData] = useState<EmailFormValues | null>(null);
  const pinCodeLength = getSettingValue('mfa-email-code-length') || 6;
  const [challengeId, setChallengeId] = useState<number | null>(null);

  const emailSchema = z.object({
    newEmail: z.string().email(t('errorEmailRequired')),
    password: z.string().min(1, t('errorPasswordRequired')),
  });

  const pinSchema = z.object({
    pin: z
      .string()
      .length(pinCodeLength, t('errorPinLength', { length: pinCodeLength })),
  });

  type EmailFormValues = z.infer<typeof emailSchema>;
  type PinFormValues = z.infer<typeof pinSchema>;

  const {
    data: userIdentifier,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['profile', 'email'],
    queryFn: async () => {
      const response = await request<UserIdentifier>({
        url: '/profile/email',
      });
      return response.data;
    },
  });

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: '',
      password: '',
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
  } = useFormDraft<EmailDraftPayload>({
    storageKey: CHANGE_EMAIL_DRAFT_STORAGE_KEY,
    value: {
      values: {
        newEmail: watchedValues.newEmail ?? '',
      },
    },
    hasData:
      (watchedValues.newEmail ?? '').trim().length > 0 &&
      (watchedValues.newEmail ?? '').trim() !==
        (userIdentifier?.value ?? '').trim(),
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

  useEffect(() => {
    const storedDraft = loadDraft();
    form.reset({
      newEmail: storedDraft?.payload.values.newEmail ?? '',
      password: '',
    });
  }, [form, loadDraft]);

  const pinForm = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      pin: '',
    },
  });

  // Estado para o código OTP
  const [verificationCode, setVerificationCode] = useState('');

  const onSubmit = async ({ newEmail, password }: EmailFormValues) => {
    if (newEmail === userIdentifier?.value) {
      showToastHandler('error', t('errorDifferentEmail'));
      return;
    }

    try {
      const { data } = await request<{ requireEmailVerification: boolean }>({
        url: '/profile/change-email',
        method: 'PUT',
        data: {
          email: newEmail,
          password: password,
        },
      });

      if (data.requireEmailVerification) {
        setPendingData({ newEmail, password });
        setShowConfirmDialog(true);
      } else {
        clearDraft();
        setPendingData(null);
        form.reset({ newEmail: '', password: '' });
        await refetch();
        showToastHandler('success', t('successEmailChanged'));
      }
    } catch {
      showToastHandler('error', t('updateFailure'));
    }
  };

  const handleSendVerificationEmail = async () => {
    try {
      const { data } = await request<{ challengeId: number }>({
        url: '/profile/email/verify',
        method: 'POST',
        data: {
          email: pendingData?.newEmail ?? userIdentifier?.value,
        },
      });

      setChallengeId(data.challengeId);

      showToastHandler('success', t('successEmailSent'));

      setShowPinDialog(true);
    } catch {
      showToastHandler('error', t('errorSendFailed'));
    }
  };

  const onPinSubmit = async () => {
    try {
      await request({
        url: '/profile/email/verify/confirm',
        method: 'POST',
        data: { pin: verificationCode, challengeId },
      });

      clearDraft();
      form.reset({ newEmail: '', password: '' });
      refetch();
      showToastHandler('success', t('successVerified'));
      setShowPinDialog(false);
      pinForm.reset();
      setVerificationCode('');
    } catch {
      showToastHandler('error', t('errorInvalidPin'));
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="mb-6 flex items-center justify-between rounded-lg border bg-muted/50 p-4">
            {isLoading ? (
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-muted-foreground/10 rounded-full h-5 w-5 animate-pulse" />
                  <div>
                    <div className="h-4 w-24 bg-muted-foreground/10 rounded animate-pulse mb-1" />
                    <div className="h-4 w-40 bg-muted-foreground/10 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-5 w-20 bg-muted-foreground/10 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Mail className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {t('currentEmailLabel')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {userIdentifier?.value}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {userIdentifier?.verified_at ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="size-5" />
                      <span className="text-sm font-medium">
                        {t('verified')}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-amber-600">
                        <XCircle className="size-5" />
                        <span className="text-sm font-medium">
                          {t('notVerified')}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSendVerificationEmail}
                      >
                        <ShieldCheck className="mr-2 size-4" />
                        {t('verifyButton')}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('newEmailLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('newEmailPlaceholder')}
                        {...field}
                      />
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
                    <FormLabel>{t('passwordLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('passwordPlaceholder')}
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Mail className="mr-2 size-4" />
                {t('changeEmailButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich('confirmDescription', {
                newEmail: String(pendingData?.newEmail),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendVerificationEmail}>
              {t('confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('verifyDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('verifyDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onPinSubmit();
            }}
            className="space-y-4"
          >
            <div className="space-y-2 flex flex-col gap-2 items-center justify-center">
              <Label className="text-sm font-medium">{t('pinCodeLabel')}</Label>
              <InputOTP
                maxLength={pinCodeLength}
                value={verificationCode}
                onChange={setVerificationCode}
              >
                {(() => {
                  const groupSize = Math.ceil(pinCodeLength / 2);
                  const groups = [
                    Array.from({ length: groupSize }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    )),
                    Array.from(
                      { length: pinCodeLength - groupSize },
                      (_, i) => (
                        <InputOTPSlot
                          key={i + groupSize}
                          index={i + groupSize}
                        />
                      )
                    ),
                  ];
                  return (
                    <>
                      <InputOTPGroup>{groups[0]}</InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>{groups[1]}</InputOTPGroup>
                    </>
                  );
                })()}
              </InputOTP>
              <Button
                type="button"
                variant="ghost"
                className="mt-2"
                onClick={handleSendVerificationEmail}
              >
                {t('resendEmailButton')}
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPinDialog(false)}
              >
                {t('cancelButton')}
              </Button>
              <Button type="submit" disabled={verificationCode.length !== 6}>
                <ShieldCheck className="mr-2 size-4" />
                {t('verifySubmitButton')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
