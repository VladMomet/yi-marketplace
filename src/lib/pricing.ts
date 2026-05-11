/**
 * Бизнес-логика расчёта цены.
 *
 * Используется в API карточки товара и при оформлении заказа.
 */

import { CNY_TO_RUB, COST_BREAKDOWN } from './constants'

export interface PriceBreakdown {
  factory: number
  logistics: number
  customs: number
  vat: number
}

export interface FullPrice {
  rub: number
  cny: number
  breakdown: PriceBreakdown
}

/**
 * Считает полную цену с разбивкой для отображения в карточке товара.
 *
 * Цена `priceRub` — финальная (Цена 1 из Excel, уже посчитанная).
 * Разбивка — приблизительная, по фиксированным долям COST_BREAKDOWN.
 */
export function calculateFullPrice(priceRub: number, priceCnyWholesale: number): FullPrice {
  return {
    rub: priceRub,
    cny: priceCnyWholesale,
    breakdown: {
      factory: Math.round((priceRub * COST_BREAKDOWN.factory) / 100),
      logistics: Math.round((priceRub * COST_BREAKDOWN.logistics) / 100),
      customs: Math.round((priceRub * COST_BREAKDOWN.customs) / 100),
      vat: Math.round((priceRub * COST_BREAKDOWN.vat) / 100),
    },
  }
}

/** Считает итоговую сумму корзины */
export function calculateCartTotal(
  items: Array<{ priceRub: number; qty: number }>
): { totalRub: number; unitsCount: number } {
  let totalRub = 0
  let unitsCount = 0
  for (const item of items) {
    totalRub += item.priceRub * item.qty
    unitsCount += item.qty
  }
  return { totalRub, unitsCount }
}

/** Курс CNY для UI (тиккер) */
export function getCnyRate(): number {
  return CNY_TO_RUB
}
