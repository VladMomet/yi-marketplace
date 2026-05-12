/**
 * FiltersSidebar — основной блок фильтров.
 *
 * Состояние читается из URL (useSearchParams), изменения обновляют URL через router.push().
 * При обновлении любого фильтра — сбрасывается page=1.
 *
 * Используется и в десктопном sidebar, и в мобильном Sheet (через `inDrawer` пропс).
 */

'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { SIZE_BUCKET_LABELS } from '@/lib/constants'
import type { CatalogResult } from '@/lib/queries/catalog'

interface Props {
  filters: CatalogResult['filters']
  inDrawer?: boolean
  /**
   * Если страница /catalog/[category] — категория уже выбрана через URL-сегмент
   * и фильтр чекбоксов не нужен (он бы дублировал/конфликтовал с URL-роутингом).
   */
  hideCategories?: boolean
}

const SIZE_OPTIONS = [
  { value: 'small', label: SIZE_BUCKET_LABELS.small },
  { value: 'medium', label: SIZE_BUCKET_LABELS.medium },
  { value: 'large', label: SIZE_BUCKET_LABELS.large },
] as const

export function FiltersSidebar({ filters, inDrawer = false, hideCategories = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  // Текущие значения фильтров из URL
  const selectedCategories = csvParam(searchParams.get('category'))
  const selectedMaterials = csvParam(searchParams.get('material'))
  const selectedStyles = csvParam(searchParams.get('style'))
  const selectedSizes = csvParam(searchParams.get('size'))

  // Локальное состояние для price input'ов (debounce при печати)
  const urlMin = searchParams.get('min_price') ?? ''
  const urlMax = searchParams.get('max_price') ?? ''
  const [minPrice, setMinPrice] = useState(urlMin)
  const [maxPrice, setMaxPrice] = useState(urlMax)

  // Синхронизировать локальное состояние с URL при back/forward navigation
  useEffect(() => {
    setMinPrice(urlMin)
    setMaxPrice(urlMax)
  }, [urlMin, urlMax])

  const setUrlParam = (
    updates: Array<[key: string, value: string | null]>
  ) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of updates) {
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    // Любое изменение фильтра → page=1
    next.delete('page')

    const qs = next.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  const toggleCsv = (key: string, currentList: string[], value: string) => {
    const next = currentList.includes(value)
      ? currentList.filter((v) => v !== value)
      : [...currentList, value]
    setUrlParam([[key, next.length > 0 ? next.join(',') : null]])
  }

  const applyPriceRange = () => {
    setUrlParam([
      ['min_price', minPrice.trim() || null],
      ['max_price', maxPrice.trim() || null],
    ])
  }

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedMaterials.length > 0 ||
    selectedStyles.length > 0 ||
    selectedSizes.length > 0 ||
    urlMin !== '' ||
    urlMax !== ''

  const clearAll = () => {
    // Сохраняем только search и sort, остальное сбрасываем
    const next = new URLSearchParams()
    const search = searchParams.get('search')
    const sort = searchParams.get('sort')
    if (search) next.set('search', search)
    if (sort) next.set('sort', sort)
    const qs = next.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  return (
    <aside
      className={cn(
        inDrawer ? '' : 'sticky top-[100px] self-start',
        pending && 'opacity-60 transition-opacity'
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium tracking-tight">Фильтры</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="font-mono text-[10.5px] uppercase tracking-wider text-cinnabar hover:underline"
          >
            Сбросить всё
          </button>
        )}
      </div>

      {/* Категория — первый блок. Скрывается на /catalog/[category] */}
      {!hideCategories && filters.categories.length > 0 && (
        <FilterGroup title="Категория">
          <ul className="-mx-1 max-h-[320px] space-y-px overflow-y-auto pr-1">
            {filters.categories.map((cat) => {
              const active = selectedCategories.includes(cat.slug)
              return (
                <li key={cat.slug}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                      active ? 'bg-paper-2' : 'hover:bg-paper-2'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-4 w-4 flex-none place-items-center rounded border transition-colors',
                        active
                          ? 'border-ink bg-ink text-paper'
                          : 'border-hair-2 bg-surface-hi'
                      )}
                    >
                      {active && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M2 5.5l2 2 4-5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleCsv('category', selectedCategories, cat.slug)}
                      className="sr-only"
                    />
                    <span className="flex-1 truncate text-ink">{cat.name_ru}</span>
                    <span className="tnum font-mono text-[10.5px] text-ink-3">
                      {cat.count}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </FilterGroup>
      )}

      {/* Размер */}
      {filters.sizes.length > 0 && (
        <FilterGroup title="Размер">
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((opt) => {
              const facet = filters.sizes.find((s) => s.value === opt.value)
              if (!facet) return null
              const active = selectedSizes.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleCsv('size', selectedSizes, opt.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                    active
                      ? 'border-ink bg-ink text-paper'
                      : 'border-hair-2 bg-surface-hi text-ink-2 hover:border-ink-2'
                  )}
                >
                  {opt.label}
                  <span className={cn('tnum', active ? 'text-paper/60' : 'text-ink-4')}>
                    {facet.count}
                  </span>
                </button>
              )
            })}
          </div>
        </FilterGroup>
      )}

      {/* Цена */}
      <FilterGroup title="Цена, ₽">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={`от ${filters.price_range.min}`}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={applyPriceRange}
            onKeyDown={(e) => e.key === 'Enter' && applyPriceRange()}
            className="tnum w-full rounded-md border border-hair-2 bg-surface-hi px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
          <span className="text-ink-3">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={`до ${filters.price_range.max}`}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={applyPriceRange}
            onKeyDown={(e) => e.key === 'Enter' && applyPriceRange()}
            className="tnum w-full rounded-md border border-hair-2 bg-surface-hi px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          Диапазон в категории: {filters.price_range.min.toLocaleString('ru-RU').replace(/,/g, ' ')}–
          {filters.price_range.max.toLocaleString('ru-RU').replace(/,/g, ' ')} ₽
        </p>
      </FilterGroup>

      {/* Материал */}
      {filters.materials.length > 0 && (
        <FilterGroup title="Материал">
          <CheckboxList
            items={filters.materials.filter((m) => m.value !== null) as Array<{ value: string; count: number }>}
            selected={selectedMaterials}
            onToggle={(v) => toggleCsv('material', selectedMaterials, v)}
          />
        </FilterGroup>
      )}

      {/* Стиль */}
      {filters.styles.length > 0 && (
        <FilterGroup title="Стиль">
          <CheckboxList
            items={filters.styles.filter((s) => s.value !== null) as Array<{ value: string; count: number }>}
            selected={selectedStyles}
            onToggle={(v) => toggleCsv('style', selectedStyles, v)}
          />
        </FilterGroup>
      )}
    </aside>
  )
}

function FilterGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-7">
      <h3 className="mb-3.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

function CheckboxList({
  items,
  selected,
  onToggle,
}: {
  items: Array<{ value: string; count: number }>
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = selected.includes(item.value)
        return (
          <li key={item.value}>
            <button
              onClick={() => onToggle(item.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                active ? 'bg-paper-2 text-ink' : 'text-ink-2 hover:bg-paper-2'
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'grid h-4 w-4 flex-shrink-0 place-items-center rounded border transition-colors',
                    active ? 'border-ink bg-ink' : 'border-hair-2 bg-surface-hi'
                  )}
                >
                  {active && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path
                        d="M1 3.5L3.5 6L8 1"
                        stroke="#F7F5F0"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="line-clamp-1">{item.value}</span>
              </span>
              <span className="tnum ml-2 flex-shrink-0 font-mono text-[10px] text-ink-3">
                {item.count}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function csvParam(value: string | null): string[] {
  if (!value) return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}
