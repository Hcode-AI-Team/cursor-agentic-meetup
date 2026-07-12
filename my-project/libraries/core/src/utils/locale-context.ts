import { AsyncLocalStorage } from 'async_hooks';

interface LocaleContext {
  locale: string;
}

export const localeStorage = new AsyncLocalStorage<LocaleContext>();

export function getLocaleFromContext(): string {
  const context = localeStorage.getStore();
  return context?.locale || 'en';
}
