/**
 * AddToCartBlock — степпер количества + основная CTA на детальной странице товара.
 *
 * Поведение:
 *  - Минимум — MIN_QTY (5 штук)
 *  - Если товара ещё нет в корзине → степпер от MIN_QTY с кнопкой «Добавить в корзину»
 *  - Если уже есть → степпер показывает текущее кол-во в корзине,
 *    кнопка превращается в «Перейти в корзину» (вместо повторного добавления)
 *  - В обоих режимах можно править число руками — синхронизируется с корзиной
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart, MIN_QTY } from '@/hooks/use-cart'
import { useCity } from '@/hooks/use-city'
import { applyCityMultiplier } from '@/lib/city-pricing'
import { Button } from '@/components/ui/button'
import { formatRub } from '@/lib/utils'

interface Props {
  productId: string
  sku: string
  title: string
  photo: string | null
  /** Базовая цена из БД (без модификатора города) */
  basePriceRub: number
}

export function AddToCartBlock({ productId, sku, title, photo, basePriceRub }: Props) {
  const { add, setQty: setCartQty, getQty } = useCart()
  const { selected: city } = useCity()
  const inCartQty = getQty(productId)
  const inCart = inCartQty > 0

  // Отображаемая цена за единицу — с учётом города
  const displayPrice = applyCityMultiplier(basePriceRub, city?.slug)

  // Локальное состояние степпера. Если товар в корзине — синхронизируем.
  // Если нет — стартуем от MIN_QTY.
  const [qty, setQtyLocal] = useState<number>(inCart ? inCartQty : MIN_QTY)

  // Когда корзина меняется снаружи (например, удалили в drawer'е), подтягиваем сюда.
  useEffect(() => {
    if (inCart) {
      setQtyLocal(inCartQty)
    } else {
      setQtyLocal(MIN_QTY)
    }
  }, [inCart, inCartQty])

  const dec = () => {
    const next = Math.max(MIN_QTY, qty - 1)
    setQtyLocal(next)
    if (inCart) setCartQty(productId, next)
  }

  const inc = () => {
    const next = Math.min(10000, qty + 1)
    setQtyLocal(next)
    if (inCart) setCartQty(productId, next)
  }

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10)
    if (!Number.isFinite(n)) return
    const clamped = Math.min(10000, Math.max(MIN_QTY, n))
    setQtyLocal(clamped)
    if (inCart) setCartQty(productId, clamped)
  }

  const handleAdd = () => {
    add({
      productId,
      sku,
      title,
      photo,
      basePriceRub,
      citySlug: city?.slug ?? null,
      qty,
    })
  }

  return (
    <div className="rounded-xl border border-hair bg-surface-hi p-5 lg:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        {/* Stepper */}
        <div className="inline-flex h-14 items-center overflow-hidden rounded-full border border-hair-2 bg-surface">
          <button
            type="button"
            onClick={dec}
            className="grid h-full w-12 place-items-center text-ink-2 transition-colors hover:bg-paper-2 disabled:opacity-30"
            disabled={qty <= MIN_QTY}
            aria-label="Уменьшить количество"
          >
            <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
              <rect width="12" height="2" rx="1" />
            </svg>
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_QTY}
            max={10000}
            value={qty}
            onChange={onInput}
            className="tnum h-full w-16 border-0 bg-transparent text-center font-display text-lg font-semibold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label="Количество"
          />
          <button
            type="button"
            onClick={inc}
            className="grid h-full w-12 place-items-center text-ink-2 transition-colors hover:bg-paper-2"
            aria-label="Увеличить количество"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="5" width="2" height="12" rx="1" />
              <rect y="5" width="12" height="2" rx="1" />
            </svg>
          </button>
        </div>

        <div className="text-right">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
            штук, мин. {MIN_QTY}
          </div>
          <div className="tnum mt-1 font-display text-sm text-ink-2">
            = {formatRub(displayPrice * qty)}
          </div>
        </div>
      </div>

      {inCart ? (
        <Link href="/checkout" className="block">
          <Button size="lg" variant="primary" className="w-full">
            Перейти в корзину · {inCartQty} шт
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7h8M7 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </Link>
      ) : (
        <Button onClick={handleAdd} size="lg" variant="primary" className="w-full">
          Добавить в корзину · {formatRub(displayPrice * qty)}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7h8M7 3l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      )}

      <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
        Менеджер свяжется в течение часа
      </p>
    </div>
  )
}
