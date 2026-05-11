/**
 * Парсинг search params страниц каталога в CatalogQuery.
 *
 * Используется и `/catalog/page.tsx`, и `/catalog/[category]/page.tsx`.
 * Все ошибки парсинга молча игнорируются — для каталога важнее всегда отдавать ответ.
 */

import type { CatalogQuery } from '@/lib/queries/catalog'

type RawParams = Record<string, string | string[] | undefined>

function strOrUndef(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function numOrUndef(value: string | string[] | undefined): number | undefined {
  const v = strOrUndef(value)
  if (v === undefined) return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

function csvOrUndef(value: string | string[] | undefined): string[] | undefined {
  const v = strOrUndef(value)
  if (!v) return undefined
  const list = v.split(',').map((s) => s.trim()).filter(Boolean)
  return list.length > 0 ? list : undefined
}

export function parseCatalogSearchParams(
  params: RawParams,
  options?: { category?: string }
): CatalogQuery {
  const sortRaw = strOrUndef(params.sort)
  const sort: CatalogQuery['sort'] =
    sortRaw === 'price-asc' || sortRaw === 'price-desc' ? sortRaw : 'popular'

  const page = (() => {
    const n = numOrUndef(params.page)
    return n !== undefined ? Math.max(1, Math.floor(n)) : 1
  })()

  const sizesRaw = csvOrUndef(params.size)
  const sizes = sizesRaw
    ? (sizesRaw.filter((s) => s === 'small' || s === 'medium' || s === 'large') as Array<
        'small' | 'medium' | 'large'
      >)
    : undefined

  return {
    category: options?.category ?? strOrUndef(params.category),
    search: strOrUndef(params.search),
    minPrice: numOrUndef(params.min_price),
    maxPrice: numOrUndef(params.max_price),
    materials: csvOrUndef(params.material),
    styles: csvOrUndef(params.style),
    sizes: sizes && sizes.length > 0 ? sizes : undefined,
    sort,
    page,
    perPage: 24,
  }
}
