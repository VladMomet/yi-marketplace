/**
 * AddToCartBlock — степпер количества + основная CTA «Добавить в корзину».
 *
 * После клика — короткая success-индикация на кнопке.
 */

'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/use-cart'
import { Button } from '@/components/ui/button'
import { formatRub } from '@/lib/utils'

interface Props {
  productId: string
  sku: string
  title: string
  photo: string | null
  priceRub: number
}

export function AddToCartBlock({ productId, sku, title, photo, priceRub }: Props) {
  const { add } = useCart()
  const [qty, setQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = () => {
    add({ productId, sku, title, photo, priceRub, qty })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1800)
  }

  return (
    <div className="rounded-xl border border-hair bg-surface-hi p-5 lg:p-6">
      <div className="mb-4 flex items-center gap-4">
        {/* Stepper */}
        <div className="inline-flex h-14 items-center overflow-hidden rounded-full border border-hair-2 bg-surface">
          <button
            type="button"
            onClick={() => setQty((v) => Math.max(1, v - 1))}
            className="grid h-full w-12 place-items-center text-ink-2 hover:bg-paper-2 transition-colors disabled:opacity-30"
            disabled={qty <= 1}
            aria-label="Уменьшить количество"
          >
            <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
              <rect width="12" height="2" rx="1" />
            </svg>
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            value={qty}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              if (Number.isFinite(n) && n > 0) setQty(Math.min(10000, n))
            }}
            className="tnum h-full w-14 border-0 bg-transparent text-center font-display text-lg font-semibold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label="Количество"
          />
          <button
            type="button"
            onClick={() => setQty((v) => Math.min(10000, v + 1))}
            className="grid h-full w-12 place-items-center text-ink-2 hover:bg-paper-2 transition-colors"
            aria-label="Увеличить количество"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="5" width="2" height="12" rx="1" />
              <rect y="5" width="12" height="2" rx="1" />
            </svg>
          </button>
        </div>

        <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
          штук
        </div>
      </div>

      <Button
        onClick={handleAdd}
        size="lg"
        variant={justAdded ? 'primary' : 'primary'}
        className={`w-full ${justAdded ? 'bg-positive hover:bg-positive' : ''}`}
        disabled={justAdded}
      >
        {justAdded ? (
          <>
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
              <path
                d="M1 5.5L5 9.5L13 1.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Добавлено в корзину
          </>
        ) : (
          <>
            Добавить в корзину · {formatRub(priceRub * qty)}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </Button>

      <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
        Менеджер свяжется в течение часа
      </p>
    </div>
  )
}
