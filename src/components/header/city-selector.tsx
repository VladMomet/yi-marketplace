/**
 * CitySelector — кнопка «Доставка в Москву», открывает выбор города.
 */

'use client'

import { useState } from 'react'
import { useCity } from '@/hooks/use-city'
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetClose } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function CitySelector() {
  const { cities, selected, select } = useCity()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-hair bg-surface-hi px-3.5 py-2 text-xs text-ink hover:border-ink-2 transition-colors"
        aria-label="Выбрать город доставки"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 1.5c-2.2 0-4 1.8-4 4 0 2.8 4 7 4 7s4-4.2 4-7c0-2.2-1.8-4-4-4zM7 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        <span className="hidden sm:inline">Доставка в</span>
        <span className="font-semibold">{selected?.nameAcc ?? selected?.nameRu ?? '—'}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      <Sheet open={open} onOpenChange={setOpen} side="right" widthClassName="w-[380px]">
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
              const isActive = city.slug === selected?.slug
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
                        'font-mono text-xs',
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
