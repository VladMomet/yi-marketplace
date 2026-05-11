/**
 * CartDrawer — основной drawer корзины.
 *
 * Состояние из useCart (localStorage). Чекаут пока ведёт на /checkout — страница
 * будет создана в Этапе 4.
 */

'use client'

import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { useCity } from '@/hooks/use-city'
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { formatRub, pluralize } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildProxyUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('https://cbu')) {
    return `/api/img-proxy?url=${encodeURIComponent(url)}`
  }
  return url
}

export function CartDrawer({ open, onOpenChange }: Props) {
  const { items, totalUnits, totalRub, isEmpty, setQty, remove } = useCart()
  const { selected: city } = useCity()

  return (
    <Sheet open={open} onOpenChange={onOpenChange} widthClassName="w-[480px]">
      <SheetHeader>
        <div>
          <SheetTitle>Корзина</SheetTitle>
          {!isEmpty && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
              {totalUnits} {pluralize(totalUnits, 'товар', 'товара', 'товаров')} ·{' '}
              доставка в {city?.nameAcc ?? city?.nameRu ?? '—'}
            </p>
          )}
        </div>
        <SheetClose onClose={() => onOpenChange(false)} />
      </SheetHeader>

      <SheetBody className="px-0 py-0">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-ink-3">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M3 3h3l2.5 12h10l2-8H6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mb-2 font-display text-lg font-medium">Здесь пока пусто</p>
            <p className="mb-6 max-w-[280px] text-sm text-ink-3">
              Откройте каталог — там более 1950 SKU с прозрачной ценой и доставкой.
            </p>
            <Button onClick={() => onOpenChange(false)} variant="primary">
              <Link href="/catalog">Открыть каталог</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-hair">
            {items.map((item) => {
              const photoUrl = buildProxyUrl(item.photo)
              return (
                <li key={item.productId} className="flex gap-4 px-6 py-5">
                  {photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photoUrl}
                      alt={item.title}
                      className="h-20 w-20 flex-none rounded-md bg-paper-2 object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 flex-none rounded-md bg-paper-2" />
                  )}

                  <div className="flex flex-1 flex-col justify-between gap-2">
                    <div>
                      <Link
                        href={`/product/${item.sku}`}
                        onClick={() => onOpenChange(false)}
                        className="line-clamp-2 text-sm font-medium hover:text-cinnabar"
                      >
                        {item.title}
                      </Link>
                      <div className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                        {item.sku}
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <QtyStepper
                        value={item.qty}
                        onChange={(qty) => setQty(item.productId, qty)}
                      />
                      <div className="text-right">
                        <div className="tnum font-display text-sm font-semibold">
                          {formatRub(item.priceRub * item.qty)}
                        </div>
                        <button
                          onClick={() => remove(item.productId)}
                          className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 hover:text-cinnabar transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SheetBody>

      {!isEmpty && (
        <SheetFooter>
          <div className="mb-4 flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
              Итого с доставкой
            </span>
            <span className="tnum font-display text-2xl font-medium tracking-tight">
              {formatRub(totalRub)}
            </span>
          </div>
          <Link href="/checkout" onClick={() => onOpenChange(false)} className="block">
            <Button variant="primary" size="lg" className="w-full">
              Оформить заказ
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </Button>
          </Link>
          <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
            Менеджер свяжется в течение часа
          </p>
        </SheetFooter>
      )}
    </Sheet>
  )
}

function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-hair-2 bg-surface-hi">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="grid h-8 w-8 place-items-center text-ink-2 hover:bg-paper-2 transition-colors"
        aria-label="Уменьшить"
      >
        <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor"><rect width="10" height="2" /></svg>
      </button>
      <span className="tnum w-8 text-center text-sm font-semibold">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="grid h-8 w-8 place-items-center text-ink-2 hover:bg-paper-2 transition-colors"
        aria-label="Увеличить"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <rect x="4" width="2" height="10" />
          <rect y="4" width="10" height="2" />
        </svg>
      </button>
    </div>
  )
}
