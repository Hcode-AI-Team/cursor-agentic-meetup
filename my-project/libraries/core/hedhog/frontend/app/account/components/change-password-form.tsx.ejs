'use client';

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
import { useApp } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export function ChangePasswordForm() {
  const { request, showToastHandler, getSettingValue, refetchUser } = useApp();
  const t = useTranslations('core.ChangePasswordForm');
  const minPasswordLength = getSettingValue('password-min-length') || 6;
  const minPasswordSymbols = getSettingValue('password-min-symbols') || 0;
  const minPasswordUppercase = getSettingValue('password-min-uppercase') || 0;
  const minPasswordNumbers = getSettingValue('password-min-numbers') || 0;

  const passwordSchema = z
    .object({
      currentPassword: z
        .string()
        .min(minPasswordLength, t('currentPasswordRequired')),
      newPassword: z
        .string()
        .min(minPasswordLength, t('newPasswordMinLength'))
        .refine(
          (val) => {
            const symbolCount = val.replace(/[a-zA-Z0-9]/g, '').length;
            return symbolCount >= minPasswordSymbols;
          },
          {
            message: t('newPasswordMinSymbols', {
              minSymbols: minPasswordSymbols,
            }),
          }
        )
        .refine(
          (val) => {
            const uppercaseCount = (val.match(/[A-Z]/g) || []).length;
            return uppercaseCount >= minPasswordUppercase;
          },
          {
            message: t('newPasswordMinUppercase', {
              minUppercase: minPasswordUppercase,
            }),
          }
        )
        .refine(
          (val) => {
            const numberCount = (val.match(/[0-9]/g) || []).length;
            return numberCount >= minPasswordNumbers;
          },
          {
            message: t('newPasswordMinNumbers', {
              minNumbers: minPasswordNumbers,
            }),
          }
        ),
      confirmPassword: z
        .string()
        .min(minPasswordLength, t('confirmPasswordRequired')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('passwordsDontMatch'),
      path: ['confirmPassword'],
    });

  type PasswordFormValues = z.infer<typeof passwordSchema>;

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    try {
      await request({
        url: '/profile/change-password',
        method: 'PUT',
        data: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
      });

      showToastHandler('success', t('updateSuccess'));
      await refetchUser();

      form.reset();
    } catch (error) {
      showToastHandler('error', t('updateFailure'));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('currentPasswordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('currentPasswordPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newPasswordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('newPasswordPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('confirmPasswordPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Lock className="mr-2 size-4" />
              {t('changePasswordButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
