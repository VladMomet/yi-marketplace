/**
 * useCart — хук работы с корзиной в localStorage.
 *
 * Корзина хранит минимум: { productId, qty, snapshot } для отображения в drawer без запроса в API.
 * Snapshot — title, photo, sku, priceRub — записывается при добавлении в корзину
 * чтобы показать товар сразу. При оформлении заказа на бэке снапшот пересчитывается.
 *
 * Синхронизация между табами через событие 'storage'.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'yi-cart'

export interface CartItem {
  productId: string
  sku: string
  title: string
  photo: string | null
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
    return parsed.filter(
      (it): it is CartItem =>
        typeof it === 'object' &&
        it !== null &&
        typeof it.productId === 'string' &&
        typeof it.qty === 'number' &&
        it.qty > 0
    )
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

    // Кросс-таб синк (event 'storage' срабатывает в других табах)
    window.addEventListener('storage', handler)
    // Внутри одного таба — наш кастомный event
    window.addEventListener('yi:cart-updated', handler)

    // Первичная синхронизация после монтирования (в SSR state из дефолта)
    handler()

    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('yi:cart-updated', handler)
    }
  }, [])

  const add = useCallback(
    (item: Omit<CartItem, 'qty'> & { qty?: number }) => {
      const current = readStorage()
      const qty = item.qty ?? 1
      const existing = current.find((it) => it.productId === item.productId)
      let next: CartItem[]
      if (existing) {
        next = current.map((it) =>
          it.productId === item.productId ? { ...it, qty: it.qty + qty } : it
        )
      } else {
        next = [
          ...current,
          {
            productId: item.productId,
            sku: item.sku,
            title: item.title,
            photo: item.photo,
            priceRub: item.priceRub,
            qty,
          },
        ]
      }
      writeStorage(next)
    },
    []
  )

  const setQty = useCallback((productId: string, qty: number) => {
    const current = readStorage()
    if (qty <= 0) {
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

  return {
    items: state.items,
    totalUnits: state.totalUnits,
    totalRub: state.totalRub,
    isEmpty: state.items.length === 0,
    add,
    setQty,
    remove,
    clear,
  }
}
