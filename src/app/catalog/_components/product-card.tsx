/**
 * ProductCard — карточка товара в сетке каталога.
 *
 * UX: вся карточка кликабельна через невидимый Link-layer (absolute inset-0 z-10),
 * кнопка «В корзину» имеет z-20 + stopPropagation чтобы перехватывать клик.
 *
 * Фото: на hover плавно переключается на второе (если есть).
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/hooks/use-cart'
import { formatRub } from '@/lib/utils'
import type { CatalogItem } from '@/lib/queries/catalog'

function buildProxyUrl(url: string): string {
  if (url.startsWith('https://cbu')) {
    return `/api/img-proxy?url=${encodeURIComponent(url)}`
  }
  return url
}

export function ProductCard({ product }: { product: CatalogItem }) {
  const { add } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  const mainPhoto = product.photos[0]
  const secondPhoto = product.photos[1] ?? mainPhoto

  const dim = product.dimensions
  const dimensionsText =
    dim.length_cm !== null && dim.width_cm !== null
      ? `${Math.round(dim.length_cm)}×${Math.round(dim.width_cm)}${
          dim.height_cm !== null ? `×${Math.round(dim.height_cm)}` : ''
        } см`
      : null

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    add({
      productId: product.id,
      sku: product.sku,
      title: product.title_ru,
      photo: mainPhoto?.url ?? null,
      priceRub: product.price_rub,
    })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1400)
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-hair bg-surface-hi transition-all duration-200 hover:border-ink-2 hover:shadow-lift">
      <Link
        href={`/product/${product.sku}`}
        className="absolute inset-0 z-10"
        aria-label={product.title_ru}
      />

      {/* Photo */}
      <div className="relative aspect-square overflow-hidden bg-paper-2">
        {mainPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={buildProxyUrl(mainPhoto.url)}
              alt={product.title_ru}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0"
            />
            {secondPhoto !== mainPhoto && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={buildProxyUrl(secondPhoto.url)}
                alt=""
                loading="lazy"
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink-4">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M6 8h28v24H6zM6 24l8-8 6 6 4-4 10 10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        )}

        {/* Category pill */}
        <div className="absolute left-3 top-3 inline-flex max-w-[60%] items-center truncate rounded-full bg-paper/90 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-2 backdrop-blur">
          {product.category.name_ru}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 font-display text-base font-medium leading-snug tracking-tight">
          {product.title_ru}
        </h3>

        {(dimensionsText || product.moq) && (
          <div className="space-y-0.5 text-xs text-ink-3">
            {dimensionsText && <div>{dimensionsText}</div>}
            {product.moq && <div>MOQ {product.moq}</div>}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <div className="tnum font-display text-xl font-semibold leading-none">
              {formatRub(product.price_rub)}
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">
              с доставкой
            </div>
          </div>

          <button
            onClick={handleAdd}
            className={`relative z-20 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors ${
              justAdded
                ? 'bg-positive text-paper'
                : 'bg-ink text-paper hover:bg-cinnabar'
            }`}
            aria-label={`Добавить «${product.title_ru}» в корзину`}
          >
            {justAdded ? (
              <>
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path
                    d="M1 4.5L4 7.5L10 1.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Добавлено
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="4" width="2" height="10" />
                  <rect y="4" width="10" height="2" />
                </svg>
                В корзину
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
