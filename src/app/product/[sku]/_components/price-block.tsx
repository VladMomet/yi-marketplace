/**
 * PriceBlock — главный блок цены на карточке товара.
 *
 * Большая цена с подписью «за единицу с доставкой».
 * Под ней — toggle «Как формируется цена» который раскрывает декомпозицию
 * (фабрика, логистика, ВЭД, НДС).
 */

'use client'

import { useState } from 'react'
import { formatRub } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  rub: number
  cny: number
  breakdown: { factory: number; logistics: number; customs: number; vat: number }
  cityName: string
}

export function PriceBlock({ rub, cny, breakdown, cityName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-hair bg-surface-hi p-6 lg:p-7">
      <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
        Цена за единицу
      </div>
      <div className="tnum font-display text-5xl font-medium leading-none tracking-tight lg:text-6xl">
        {formatRub(rub)}
      </div>
      <div className="mt-3 text-sm text-ink-3">
        С доставкой в {cityName} · ~{cny.toFixed(0)} ¥
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-2 hover:text-cinnabar transition-colors"
        aria-expanded={open}
      >
        Как формируется цена
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={cn('transition-transform', open ? 'rotate-180' : '')}
          aria-hidden="true"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="mt-4 border-t border-hair pt-5 animate-[fadeIn_400ms_ease]">
          <ul className="space-y-3">
            <BreakdownRow label="Фабрика 1688" value={breakdown.factory} percent={55} />
            <BreakdownRow
              label="Логистика Иу → РФ"
              value={breakdown.logistics}
              percent={25}
            />
            <BreakdownRow
              label="ВЭД, таможня, сертификация"
              value={breakdown.customs}
              percent={3}
            />
            <BreakdownRow label="НДС 20%" value={breakdown.vat} percent={17} />
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-hair pt-4">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
              Итого с доставкой
            </span>
            <span className="tnum font-display text-xl font-semibold tracking-tight">
              {formatRub(rub)}
            </span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-3">
            Распределение приблизительное. Точные расчёты по партии — у менеджера.
            Цена уже включает все этапы до Москвы.
          </p>
        </div>
      )}
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  percent,
}: {
  label: string
  value: number
  percent: number
}) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3">
      <div className="text-sm text-ink-2">{label}</div>
      <div className="tnum flex items-baseline gap-3 text-right">
        <span className="font-mono text-[10.5px] text-ink-4">~{percent}%</span>
        <span className="font-display text-sm font-semibold tracking-tight">
          {formatRub(value)}
        </span>
      </div>
    </li>
  )
}
