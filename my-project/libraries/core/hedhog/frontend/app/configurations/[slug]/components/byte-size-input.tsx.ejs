'use client';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type ByteUnit = 'bytes' | 'kb' | 'mb' | 'gb' | 'tb';

// Base binária (1024) — consistente com os valores existentes (ex.: 10485760 = 10 MB).
const UNIT_BYTES: Record<ByteUnit, number> = {
  bytes: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
};

// Da maior para a menor unidade — usado para escolher a melhor unidade de exibição.
const UNIT_ORDER: ByteUnit[] = ['tb', 'gb', 'mb', 'kb', 'bytes'];

const STORAGE_PREFIX = 'byte-unit:';

/** Maior unidade que divide o total exatamente (default: bytes). */
function pickBestUnit(totalBytes: number): ByteUnit {
  if (totalBytes > 0) {
    for (const unit of UNIT_ORDER) {
      if (totalBytes % UNIT_BYTES[unit] === 0) {
        return unit;
      }
    }
  }
  return 'bytes';
}

function readSavedUnit(persistKey?: string): ByteUnit | null {
  if (!persistKey || typeof window === 'undefined') {
    return null;
  }
  const saved = window.localStorage.getItem(STORAGE_PREFIX + persistKey);
  return saved && saved in UNIT_BYTES ? (saved as ByteUnit) : null;
}

function toDisplay(totalBytes: number, unit: ByteUnit): string {
  if (!totalBytes) {
    return '0';
  }
  const value = totalBytes / UNIT_BYTES[unit];
  // Evita ruído de ponto flutuante (ex.: 0.30000000000000004).
  return String(Math.round(value * 10000) / 10000);
}

export interface ByteSizeInputProps {
  /** Valor total em bytes (unidade canônica armazenada). */
  value: number;
  /** Chamado com o novo total em bytes. */
  onChange: (totalBytes: number) => void;
  /** Slug do setting — usado para lembrar a unidade escolhida no localStorage. */
  persistKey?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Input numérico com seletor de unidade (Bytes/KB/MB/GB/TB, base binária 1024). O valor é
 * sempre persistido em **bytes**; o usuário escolhe apenas como visualizar/editar e a conversão
 * de volta para bytes acontece a cada alteração. A unidade inicial é a maior que divide o valor
 * exatamente (ou a última escolhida pelo usuário, se houver `persistKey`).
 *
 * Irmão do `DurationInput` (segundos → min/horas/dias).
 */
export function ByteSizeInput({
  value,
  onChange,
  persistKey,
  disabled,
  className,
}: ByteSizeInputProps) {
  const t = useTranslations('core.Configurations');
  const total = Math.max(0, Math.floor(Number(value) || 0));

  const [unit, setUnit] = useState<ByteUnit>(
    () => readSavedUnit(persistKey) ?? pickBestUnit(total)
  );
  // Texto digitado em andamento. Quando `null`, a exibição é derivada de `value` + `unit`
  // (mantém-se sincronizado com mudanças externas sem precisar de efeito/setState).
  const [editValue, setEditValue] = useState<string | null>(null);

  const display = editValue ?? toDisplay(total, unit);

  const handleInputChange = (raw: string) => {
    setEditValue(raw);
    const parsed = parseFloat(raw);
    const bytes = Number.isFinite(parsed)
      ? Math.max(0, Math.round(parsed * UNIT_BYTES[unit]))
      : 0;
    onChange(bytes);
  };

  const handleBlur = () => {
    // Volta a exibir o valor canônico (reformatado) na unidade atual.
    setEditValue(null);
  };

  const handleUnitChange = (nextUnit: ByteUnit) => {
    // Troca de unidade é só exibição: mantém os bytes constantes, não dispara onChange.
    setUnit(nextUnit);
    setEditValue(null);
    if (persistKey && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_PREFIX + persistKey, nextUnit);
    }
  };

  return (
    <InputGroup className={cn('bg-background', className)}>
      <InputGroupInput
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        disabled={disabled}
        value={display}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleBlur}
      />
      <InputGroupAddon align="inline-end" className="pr-1">
        <Select
          value={unit}
          onValueChange={(next) => handleUnitChange(next as ByteUnit)}
          disabled={disabled}
        >
          <SelectTrigger
            size="sm"
            className="h-7 gap-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bytes">{t('byteUnitBytes')}</SelectItem>
            <SelectItem value="kb">{t('byteUnitKB')}</SelectItem>
            <SelectItem value="mb">{t('byteUnitMB')}</SelectItem>
            <SelectItem value="gb">{t('byteUnitGB')}</SelectItem>
            <SelectItem value="tb">{t('byteUnitTB')}</SelectItem>
          </SelectContent>
        </Select>
      </InputGroupAddon>
    </InputGroup>
  );
}
