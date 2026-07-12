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

type DurationUnit = 'seconds' | 'minutes' | 'hours' | 'days';

const UNIT_SECONDS: Record<DurationUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
};

// Da maior para a menor unidade — usado para escolher a melhor unidade de exibição.
const UNIT_ORDER: DurationUnit[] = ['days', 'hours', 'minutes', 'seconds'];

const STORAGE_PREFIX = 'duration-unit:';

/** Maior unidade que divide o total exatamente (default: segundos). */
function pickBestUnit(totalSeconds: number): DurationUnit {
  if (totalSeconds > 0) {
    for (const unit of UNIT_ORDER) {
      if (totalSeconds % UNIT_SECONDS[unit] === 0) {
        return unit;
      }
    }
  }
  return 'seconds';
}

function readSavedUnit(persistKey?: string): DurationUnit | null {
  if (!persistKey || typeof window === 'undefined') {
    return null;
  }
  const saved = window.localStorage.getItem(STORAGE_PREFIX + persistKey);
  return saved && saved in UNIT_SECONDS ? (saved as DurationUnit) : null;
}

function toDisplay(totalSeconds: number, unit: DurationUnit): string {
  if (!totalSeconds) {
    return '0';
  }
  const value = totalSeconds / UNIT_SECONDS[unit];
  // Evita ruído de ponto flutuante (ex.: 0.30000000000000004).
  return String(Math.round(value * 10000) / 10000);
}

export interface DurationInputProps {
  /** Valor total em segundos (unidade canônica armazenada). */
  value: number;
  /** Chamado com o novo total em segundos. */
  onChange: (totalSeconds: number) => void;
  /** Slug do setting — usado para lembrar a unidade escolhida no localStorage. */
  persistKey?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Input numérico com seletor de unidade (segundos/minutos/horas/dias). O valor é sempre
 * persistido em **segundos**; o usuário escolhe apenas como visualizar/editar e a conversão
 * de volta para segundos acontece a cada alteração. A unidade inicial é a maior que divide
 * o valor exatamente (ou a última escolhida pelo usuário, se houver `persistKey`).
 *
 * Não confundir com o `InputDuration` (campo mascarado mm:ss) usado na estrutura de cursos do LMS.
 */
export function DurationInput({
  value,
  onChange,
  persistKey,
  disabled,
  className,
}: DurationInputProps) {
  const t = useTranslations('core.Configurations');
  const total = Math.max(0, Math.floor(Number(value) || 0));

  const [unit, setUnit] = useState<DurationUnit>(
    () => readSavedUnit(persistKey) ?? pickBestUnit(total)
  );
  // Texto digitado em andamento. Quando `null`, a exibição é derivada de `value` + `unit`
  // (mantém-se sincronizado com mudanças externas sem precisar de efeito/setState).
  const [editValue, setEditValue] = useState<string | null>(null);

  const display = editValue ?? toDisplay(total, unit);

  const handleInputChange = (raw: string) => {
    setEditValue(raw);
    const parsed = parseFloat(raw);
    const seconds = Number.isFinite(parsed)
      ? Math.max(0, Math.round(parsed * UNIT_SECONDS[unit]))
      : 0;
    onChange(seconds);
  };

  const handleBlur = () => {
    // Volta a exibir o valor canônico (reformatado) na unidade atual.
    setEditValue(null);
  };

  const handleUnitChange = (nextUnit: DurationUnit) => {
    // Troca de unidade é só exibição: mantém os segundos constantes, não dispara onChange.
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
          onValueChange={(next) => handleUnitChange(next as DurationUnit)}
          disabled={disabled}
        >
          <SelectTrigger
            size="sm"
            className="h-7 gap-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="seconds">{t('durationUnitSeconds')}</SelectItem>
            <SelectItem value="minutes">{t('durationUnitMinutes')}</SelectItem>
            <SelectItem value="hours">{t('durationUnitHours')}</SelectItem>
            <SelectItem value="days">{t('durationUnitDays')}</SelectItem>
          </SelectContent>
        </Select>
      </InputGroupAddon>
    </InputGroup>
  );
}
