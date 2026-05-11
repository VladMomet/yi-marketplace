/**
 * DeliveryBlock — карточка с маршрутом доставки и сроками.
 *
 * Изначально (SSR) рендерится с городом-дефолтом из БД (`initialCity`).
 * После гидрации хук useCity подменяет на выбранный пользователем,
 * если в cookie стоит другой город.
 *
 * Кнопка «Сменить город» открывает локальный Sheet со списком городов.
 */

'use client'

import { useState } from 'react'
import { useCity } from '@/hooks/use-city'
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetClose } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface InitialCity {
  slug: string
  name_ru: string
  name_acc: string | null
}

interface InitialDelivery {
  city: InitialCity
  days_min: number
  days_max: number
}

export function DeliveryBlock({ initial }: { initial: InitialDelivery | null }) {
  const { cities, selected, select } = useCity()
  const [open, setOpen] = useState(false)

  // На SSR и до гидрации useCity — показываем initial.
  // После гидрации useCity подтянет cookie и переключит на свой выбор.
  const displayCity = selected
    ? {
        slug: selected.slug,
        nameRu: selected.nameRu,
        nameAcc: selected.nameAcc,
        daysMin: selected.daysMin,
        daysMax: selected.daysMax,
      }
    : initial
    ? {
        slug: initial.city.slug,
        nameRu: initial.city.name_ru,
        nameAcc: initial.city.name_acc,
        daysMin: initial.days_min,
        daysMax: initial.days_max,
      }
    : null

  if (!displayCity) return null

  return (
    <>
      <div className="rounded-xl border border-hair bg-paper p-5 lg:p-6">
        <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
          Доставка
        </div>

        <div className="mb-3 flex items-baseline gap-2 font-display text-lg font-medium tracking-tight">
          Иу <span className="text-ink-4">→</span> {displayCity.nameRu}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M7 4v3l2 2"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="tnum">{displayCity.daysMin}–{displayCity.daysMax} дней</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 6h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span>С документами</span>
          </span>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-cinnabar hover:underline"
        >
          Сменить город
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen} widthClassName="w-[380px]">
        <SheetHeader>
          <SheetTitle>Город доставки</SheetTitle>
          <SheetClose onClose={() => setOpen(false)} />
        </SheetHeader>
        <SheetBody>
          <p className="mb-5 text-sm text-ink-3">
            Срок указан до вашего города. Цена в каталоге уже включает доставку.
          </p>
          <ul className="space-y-1">
            {cities.map((city) => {
              const isActive = city.slug === displayCity.slug
              return (
                <li key={city.id}>
                  <button
                    onClick={() => {
                      select(city.slug)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-4 py-3 text-left transition-colors',
                      isActive
                        ? 'bg-ink text-paper'
                        : 'bg-transparent text-ink hover:bg-paper-2'
                    )}
                  >
                    <span className="font-semibold">{city.nameRu}</span>
                    <span
                      className={cn(
                        'tnum font-mono text-xs',
                        isActive ? 'text-paper/70' : 'text-ink-3'
                      )}
                    >
                      {city.daysMin}–{city.daysMax} дн.
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </SheetBody>
      </Sheet>
    </>
  )
}
