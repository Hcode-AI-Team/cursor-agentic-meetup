import { describe, it, expect } from '@jest/globals';
import { getLocaleFromContext, localeStorage } from './locale-context';

describe('locale-context', () => {
  it('retorna "en" quando não há contexto', () => {
    expect(getLocaleFromContext()).toBe('en');
  });

  it('retorna locale do storage dentro de run()', () => {
    const result = localeStorage.run({ locale: 'pt' }, () =>
      getLocaleFromContext(),
    );
    expect(result).toBe('pt');
  });

  it('cai para "en" quando locale do contexto é vazio', () => {
    const result = localeStorage.run({ locale: '' }, () =>
      getLocaleFromContext(),
    );
    expect(result).toBe('en');
  });
});
