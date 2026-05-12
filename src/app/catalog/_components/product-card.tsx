/**
 * ProductCard — карточка товара в сетке каталога.
 *
 * UX: вся карточка кликабельна через невидимый Link-layer (absolute inset-0 z-10),
 * блок управления корзиной имеет z-20 + stopPropagation чтобы перехватывать клики.
 *
 * Фото: на hover плавно переключается на второе (если есть).
 *
 * Поведение:
 *  - Если товара нет в корзине — кнопка «+5 в корзину» (MIN_QTY)
 *  - Если есть — степпер с минусом, количеством и плюсом
 *  - Степпер уменьшает шагами по 1, но не ниже MIN_QTY. Удалить позицию — отдельно
 *    в самом drawer'е корзины (там есть кнопка «Удалить»).
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart, MIN_QTY } from '@/hooks/use-cart'
import { useCity } from '@/hooks/use-city'
import { applyCityMultiplier } from '@/lib/city-pricing'
import { formatRub } from '@/lib/utils'
import type { CatalogItem } from '@/lib/queries/catalog'

export function ProductCard({ product }: { product: CatalogItem }) {
  const { add, setQty, getQty } = useCart()
  const { selected: city } = useCity()
  const qty = getQty(product.id)
  const inCart = qty > 0

  // Цена с учётом города пользователя
  const displayPrice = applyCityMultiplier(product.price_rub, city?.slug)

  const mainPhoto = product.photos[0]
  const secondPhoto = product.photos[1] ?? mainPhoto

  const dim = product.dimensions
  const dimensionsText =
    dim.length_cm !== null && dim.width_cm !== null
      ? `${Math.round(dim.length_cm)}×${Math.round(dim.width_cm)}${
          dim.height_cm !== null ? `×${Math.round(dim.height_cm)}` : ''
        } см`
      : null

  const stopAndPrevent = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleAdd = (e: React.MouseEvent) => {
    stopAndPrevent(e)
    add({
      productId: product.id,
      sku: product.sku,
      title: product.title_ru,
      photo: mainPhoto?.url ?? null,
      basePriceRub: product.price_rub,
      citySlug: city?.slug ?? null,
    })
  }

  const handleDec = (e: React.MouseEvent) => {
    stopAndPrevent(e)
    setQty(product.id, qty - 1)
  }

  const handleInc = (e: React.MouseEvent) => {
    stopAndPrevent(e)
    setQty(product.id, qty + 1)
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
            <Image
              src={mainPhoto.url}
              alt={product.title_ru}
              fill
              // sizes — Vercel ресайзит под нужный размер. На мобилке карточка
              // ~50vw (две колонки), на десктопе ~25vw (4 колонки).
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-opacity duration-500 group-hover:opacity-0"
              // Не loading="eager" — карточки далеко вниз лениво грузятся.
              loading="lazy"
            />
            {secondPhoto !== mainPhoto && (
              <Image
                src={secondPhoto.url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                aria-hidden
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                loading="lazy"
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
            <div>от {MIN_QTY} шт</div>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <div className="tnum font-display text-xl font-semibold leading-none">
              {formatRub(displayPrice)}
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">
              {inCart ? `× ${qty} = ${formatRub(displayPrice * qty)}` : 'с доставкой'}
            </div>
          </div>

          {inCart ? (
            <div
              className="relative z-20 inline-flex h-10 items-center overflow-hidden rounded-full bg-ink text-paper"
              onClick={stopAndPrevent}
            >
              <button
                type="button"
                onClick={handleDec}
                className="grid h-10 w-10 place-items-center transition-colors hover:bg-cinnabar"
                aria-label="Уменьшить"
              >
                <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
                  <rect width="10" height="2" />
                </svg>
              </button>
              <span className="tnum min-w-[28px] text-center text-xs font-semibold">{qty}</span>
              <button
                type="button"
                onClick={handleInc}
                className="grid h-10 w-10 place-items-center transition-colors hover:bg-cinnabar"
                aria-label="Увеличить"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="4" width="2" height="10" />
                  <rect y="4" width="10" height="2" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="relative z-20 inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-semibold text-paper transition-colors hover:bg-cinnabar"
              aria-label={`Добавить «${product.title_ru}» в корзину`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect x="4" width="2" height="10" />
                <rect y="4" width="10" height="2" />
              </svg>
              {MIN_QTY} в корзину
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
