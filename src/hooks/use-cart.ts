/**
 * useCart — хук работы с корзиной в localStorage.
 *
 * Корзина хранит минимум: { productId, qty, snapshot }.
 *
 * Snapshot цены:
 *  - basePriceRub — базовая цена в БД (та что включает доставку до Москвы)
 *  - priceRub — отображаемая цена с учётом текущего модификатора города
 *
 * При смене города priceRub пересчитывается из basePriceRub через recalcCart().
 *
 * MOQ: минимальный заказ — 5 штук на позицию. При добавлении нового товара
 * сразу кладём 5 штук. Уменьшить ниже 5 нельзя — есть кнопка «Удалить».
 *
 * Синхронизация между табами через событие 'storage'.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { applyCityMultiplier } from '@/lib/city-pricing'

const STORAGE_KEY = 'yi-cart'

/** Минимальное количество штук на одну позицию */
export const MIN_QTY = 5

export interface CartItem {
  productId: string
  sku: string
  title: string
  photo: string | null
  /** Базовая цена из БД (Москва, без модификатора) */
  basePriceRub: number
  /** Цена с учётом города пользователя в момент последнего пересчёта */
  priceRub: number
  qty: number
}

interface CartState {
  items: CartItem[]
  /** Общее количество штук (для бейджа) */
  totalUnits: number
  /** Итоговая сумма */
  totalRub: number
}

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (it): it is Partial<CartItem> =>
          typeof it === 'object' &&
          it !== null &&
          typeof it.productId === 'string' &&
          typeof it.qty === 'number' &&
          it.qty > 0
      )
      .map((it) => {
        // Миграция со старых записей где не было basePriceRub:
        // считаем priceRub базовой и priceRub текущей одинаковыми.
        const priceRub = typeof it.priceRub === 'number' ? it.priceRub : 0
        const basePriceRub =
          typeof it.basePriceRub === 'number' ? it.basePriceRub : priceRub
        return {
          productId: it.productId!,
          sku: typeof it.sku === 'string' ? it.sku : '',
          title: typeof it.title === 'string' ? it.title : '',
          photo: typeof it.photo === 'string' ? it.photo : null,
          basePriceRub,
          priceRub,
          qty: it.qty!,
        }
      })
  } catch {
    return []
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    // Уведомить другие компоненты в этом же табе
    window.dispatchEvent(new CustomEvent('yi:cart-updated'))
  } catch {
    /* silent */
  }
}

function calc(items: CartItem[]): CartState {
  let totalUnits = 0
  let totalRub = 0
  for (const it of items) {
    totalUnits += it.qty
    totalRub += it.qty * it.priceRub
  }
  return { items, totalUnits, totalRub }
}

export function useCart() {
  const [state, setState] = useState<CartState>(() => calc(readStorage()))

  useEffect(() => {
    const handler = () => setState(calc(readStorage()))

    // Когда сменился город — пересчитываем priceRub у всех товаров
    // (берём basePriceRub и применяем новый множитель), затем перерисовываемся.
    const onCityChange = (e: Event) => {
      const detail = (e as CustomEvent<{ slug?: string | null }>).detail
      const newSlug = detail?.slug ?? null
      const current = readStorage()
      if (current.length === 0) return
      const next = current.map((it) => ({
        ...it,
        priceRub: applyCityMultiplier(it.basePriceRub, newSlug),
      }))
      writeStorage(next)
      // writeStorage уже диспатчит yi:cart-updated → handler перечитает state
    }

    window.addEventListener('storage', handler)
    window.addEventListener('yi:cart-updated', handler)
    window.addEventListener('yi:city-changed', onCityChange)
    handler()

    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('yi:cart-updated', handler)
      window.removeEventListener('yi:city-changed', onCityChange)
    }
  }, [])

  /**
   * Добавить товар. Принимаем basePriceRub (из БД) и текущий citySlug,
   * сами считаем отображаемую цену.
   */
  const add = useCallback(
    (item: {
      productId: string
      sku: string
      title: string
      photo: string | null
      basePriceRub: number
      citySlug: string | null | undefined
      qty?: number
    }) => {
      const current = readStorage()
      const addQty = item.qty ?? MIN_QTY
      const priceRub = applyCityMultiplier(item.basePriceRub, item.citySlug)
      const existing = current.find((it) => it.productId === item.productId)
      let next: CartItem[]
      if (existing) {
        next = current.map((it) =>
          it.productId === item.productId
            ? { ...it, qty: it.qty + addQty, basePriceRub: item.basePriceRub, priceRub }
            : it
        )
      } else {
        next = [
          ...current,
          {
            productId: item.productId,
            sku: item.sku,
            title: item.title,
            photo: item.photo,
            basePriceRub: item.basePriceRub,
            priceRub,
            qty: Math.max(addQty, MIN_QTY),
          },
        ]
      }
      writeStorage(next)
    },
    []
  )

  /**
   * Пересчитать цены всех товаров по новому городу.
   * Используется в useCity.select() — при смене города.
   */
  const recalcForCity = useCallback((citySlug: string | null | undefined) => {
    const current = readStorage()
    const next = current.map((it) => ({
      ...it,
      priceRub: applyCityMultiplier(it.basePriceRub, citySlug),
    }))
    writeStorage(next)
  }, [])

  const setQty = useCallback((productId: string, qty: number) => {
    const current = readStorage()
    if (qty < MIN_QTY) {
      writeStorage(current.filter((it) => it.productId !== productId))
      return
    }
    writeStorage(
      current.map((it) => (it.productId === productId ? { ...it, qty } : it))
    )
  }, [])

  const remove = useCallback((productId: string) => {
    const current = readStorage()
    writeStorage(current.filter((it) => it.productId !== productId))
  }, [])

  const clear = useCallback(() => {
    writeStorage([])
  }, [])

  const getQty = useCallback(
    (productId: string): number => {
      const found = state.items.find((it) => it.productId === productId)
      return found?.qty ?? 0
    },
    [state.items]
  )

  return {
    items: state.items,
    totalUnits: state.totalUnits,
    totalRub: state.totalRub,
    isEmpty: state.items.length === 0,
    add,
    setQty,
    remove,
    clear,
    getQty,
    recalcForCity,
    MIN_QTY,
  }
}
