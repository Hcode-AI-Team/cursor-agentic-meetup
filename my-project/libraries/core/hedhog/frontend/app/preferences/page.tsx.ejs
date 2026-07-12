'use client';

import { PageHeader } from '@/components/entity-list';
import { LanguageSelector } from '@/components/language-selector';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaginatedResult } from '@/types/pagination-result';
import { Setting, SettingList } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const THEME_SOURCE_STORAGE_KEY = 'theme-source';

const getStoredThemeSource = (): 'explicit' | 'fallback' | null => {
  if (typeof window === 'undefined') return null;

  const rawThemeSource = window.localStorage.getItem(THEME_SOURCE_STORAGE_KEY);
  if (rawThemeSource === null) return null;

  try {
    const parsedThemeSource = JSON.parse(rawThemeSource);
    return parsedThemeSource === 'explicit' || parsedThemeSource === 'fallback'
      ? parsedThemeSource
      : null;
  } catch {
    return rawThemeSource === 'explicit' || rawThemeSource === 'fallback'
      ? rawThemeSource
      : null;
  }
};

export default function PreferencesPage() {
  const {
    currentTheme,
    setCurrentTheme,
    density,
    setDensity,
    zoom,
    setZoom,
    refetchUser,
    request,
    getSettingValue,
    setSettingValue,
    showToastHandler,
    currentLocaleCode,
  } = useApp();
  const t = useTranslations('core.PreferencesPage');

  // Buspnpm grupo de localization
  const { data: localizationSettings, isLoading } = useQuery<
    PaginatedResult<Setting>
  >({
    queryKey: ['setting', 'localization', currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResult<Setting>>({
        url: '/setting/group/localization',
      });
      return response.data;
    },
  });

  // Encontra as settings específicas
  const dateFormatSetting = localizationSettings?.data?.find(
    (s: Setting) => s.slug === 'date-format'
  );
  const timeFormatSetting = localizationSettings?.data?.find(
    (s: Setting) => s.slug === 'time-format'
  );
  const timezoneSetting = localizationSettings?.data?.find(
    (s: Setting) => s.slug === 'timezone'
  );

  const dateFormat = getSettingValue('date-format') || 'dd/MM/yyyy';
  const timeFormat = getSettingValue('time-format') || 'HH:mm:ss';
  const timezone = getSettingValue('timezone') || 'UTC';

  const schema = z.object({
    language: z.string().min(1, t('languageRequired')),
    theme: z.string().min(1, t('themeRequired')),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      language: '',
      theme: '',
    },
  });

  const handleThemeChange = async (value: 'light' | 'dark' | 'system') => {
    const previousTheme = currentTheme;
    const previousThemeSource = getStoredThemeSource();
    setCurrentTheme(value);

    try {
      await request({
        url: '/profile/preferences',
        method: 'PUT',
        data: { theme: value },
      });
      await refetchUser();
    } catch {
      setCurrentTheme(previousTheme);

      if (typeof window !== 'undefined' && previousThemeSource !== 'explicit') {
        window.localStorage.removeItem(THEME_SOURCE_STORAGE_KEY);
      }

      await refetchUser();
      showToastHandler(
        'error',
        t('themeUpdateError') || 'Failed to update theme'
      );
    }
  };

  const handleSpacingDensityChange = (
    value: 'compact' | 'comfortable' | 'spacious'
  ) => {
    setDensity(value);
    showToastHandler(
      'success',
      t('spacingDensityUpdated') || 'Spacing density updated successfully'
    );
  };

  const handleZoomChange = (value: string) => {
    setZoom(value);
    showToastHandler('success', t('zoomUpdated') || 'Zoom updated successfully');
  };

  const handleLanguageChange = async (code: string) => {
    try {
      await request({
        url: '/profile/preferences',
        method: 'PUT',
        data: { language: code },
      });
      await refetchUser();
    } catch (error) {
      showToastHandler(
        'error',
        t('languageUpdateError') || 'Failed to update language'
      );
      throw error;
    }
  };

  const handleDateFormatChange = async (value: string) => {
    try {
      await setSettingValue('date-format', value);
      showToastHandler(
        'success',
        t('dateFormatUpdated') || 'Date format updated successfully'
      );
    } catch {
      showToastHandler(
        'error',
        t('dateFormatUpdateError') || 'Failed to update date format'
      );
    }
  };

  const handleTimeFormatChange = async (value: string) => {
    try {
      await setSettingValue('time-format', value);
      showToastHandler(
        'success',
        t('timeFormatUpdated') || 'Time format updated successfully'
      );
    } catch {
      showToastHandler(
        'error',
        t('timeFormatUpdateError') || 'Failed to update time format'
      );
    }
  };

  const handleTimezoneChange = async (value: string) => {
    try {
      await setSettingValue('timezone', value);
      showToastHandler(
        'success',
        t('timezoneUpdated') || 'Timezone updated successfully'
      );
    } catch {
      showToastHandler(
        'error',
        t('timezoneUpdateError') || 'Failed to update timezone'
      );
    }
  };

  return (
    <div className="flex flex-col h-screen px-4">
      <PageHeader
        breadcrumbs={[
          { label: t('home'), href: '/dashboard' },
          { label: t('title') },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <div className="mt-2">
        <Form {...form}>
          <form className="space-y-6">
            <h2 className="text-1xl font-bold text-primary mb-1">
              {t('appearance')}
            </h2>
            <Card className="border-none bg-accent">
              <CardContent className="flex-col gap-4">
                <div className="flex justify-between">
                  <div className="flex-col">
                    <label className="font-semibold">{t('theme')}</label>
                    <p className="text-muted-foreground text-sm">
                      {t('setPreferredTheme')}
                    </p>
                  </div>

                  <div className="h-full flex items-center">
                    <Select
                      value={currentTheme}
                      onValueChange={handleThemeChange}
                    >
                      <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder={t('selectTheme')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t('light')}</SelectItem>
                        <SelectItem value="dark">{t('dark')}</SelectItem>
                        <SelectItem value="system">{t('system')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between mt-4">
                  <div className="flex-col">
                    <label className="font-semibold">
                      {t('spacingDensity')}
                    </label>
                    <p className="text-muted-foreground text-sm">
                      {t('setPreferredSpacingDensity')}
                    </p>
                  </div>

                  <div className="h-full flex items-center">
                    <Select
                      value={density}
                      onValueChange={handleSpacingDensityChange}
                    >
                      <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder={t('selectSpacingDensity')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">
                          {t('densityCompact')}
                        </SelectItem>
                        <SelectItem value="comfortable">
                          {t('densityComfortable')}
                        </SelectItem>
                        <SelectItem value="spacious">
                          {t('densitySpacious')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between mt-4">
                  <div className="flex-col">
                    <label className="font-semibold">{t('zoom')}</label>
                    <p className="text-muted-foreground text-sm">
                      {t('setPreferredZoom')}
                    </p>
                  </div>

                  <div className="h-full flex items-center">
                    <Select value={zoom} onValueChange={handleZoomChange}>
                      <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder={t('selectZoom')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="80%">80%</SelectItem>
                        <SelectItem value="90%">90%</SelectItem>
                        <SelectItem value="100%">100%</SelectItem>
                        <SelectItem value="110%">110%</SelectItem>
                        <SelectItem value="125%">125%</SelectItem>
                        <SelectItem value="150%">150%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-1xl font-bold text-primary mb-1">
              {t('localization')}
            </h2>
            <Card className="border-none bg-accent">
              <CardContent className="flex-col gap-4">
                <div className="flex justify-between">
                  <div className="flex-col">
                    <label className="font-semibold">{t('language')}</label>
                    <p className="text-muted-foreground text-sm">
                      {t('setPreferredLanguage')}
                    </p>
                  </div>

                  <div className="h-full flex items-center">
                    <LanguageSelector onChange={handleLanguageChange} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-1xl font-bold text-primary mb-1">
              {t('dateAndTimeFormat')}
            </h2>
            <Card className="border-none bg-accent">
              {isLoading && (
                <CardContent className="flex h-32 w-full items-center justify-center">
                  <Loader className="animate-spin text-muted-foreground w-4 h-4" />
                </CardContent>
              )}
              {!isLoading && dateFormatSetting && timeFormatSetting && (
                <CardContent className="flex-col gap-4">
                  <div className="flex justify-between">
                    <div className="flex-col">
                      <label className="font-semibold">{t('dateFormat')}</label>
                      <p className="text-muted-foreground text-sm">
                        {t('setPreferredDateFormat')}
                      </p>
                    </div>

                    <div className="h-full flex items-center">
                      <Select
                        value={dateFormat}
                        onValueChange={handleDateFormatChange}
                      >
                        <SelectTrigger className="w-[180px] bg-background">
                          <SelectValue
                            placeholder={
                              t('selectDateFormat') || 'Select format'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(dateFormatSetting.setting_list || []).map(
                            (option: SettingList) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.value}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between mt-4">
                    <div className="flex-col">
                      <label className="font-semibold">{t('timeFormat')}</label>
                      <p className="text-muted-foreground text-sm">
                        {t('setPreferredTimeFormat')}
                      </p>
                    </div>

                    <div className="h-full flex items-center">
                      <Select
                        value={timeFormat}
                        onValueChange={handleTimeFormatChange}
                      >
                        <SelectTrigger className="w-[180px] bg-background">
                          <SelectValue
                            placeholder={
                              t('selectTimeFormat') || 'Select format'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(timeFormatSetting.setting_list || []).map(
                            (option: SettingList) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.value}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <h2 className="text-1xl font-bold text-primary mb-1">
              {t('timezone')}
            </h2>
            <Card className="border-none bg-accent">
              {isLoading && (
                <CardContent className="flex h-32 w-full items-center justify-center">
                  <Loader className="animate-spin text-muted-foreground w-4 h-4" />
                </CardContent>
              )}
              {!isLoading && timezoneSetting && (
                <CardContent className="flex-col gap-4">
                  <div className="flex justify-between">
                    <div className="flex-col">
                      <label className="font-semibold">
                        {timezoneSetting.name || t('timezone')}
                      </label>
                      <p className="text-muted-foreground text-sm">
                        {timezoneSetting.description ||
                          t('setPreferredTimezone')}
                      </p>
                    </div>

                    <div className="h-full flex items-center">
                      <Select
                        key={timezone}
                        value={timezone}
                        onValueChange={handleTimezoneChange}
                      >
                        <SelectTrigger className="w-60 bg-background">
                          <SelectValue
                            placeholder={
                              t('selectTimezone') || 'Select timezone'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(timezoneSetting.setting_list || []).map(
                            (option: SettingList) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.value}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
