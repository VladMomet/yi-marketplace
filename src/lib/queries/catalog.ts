/**
 * queryCatalog — общая функция получения каталога товаров.
 *
 * Используется и в API-ручке /api/products, и напрямую в server component'ах
 * страниц /catalog и /catalog/[category]. Single source of truth для логики.
 */

import { and, eq, gte, lte, inArray, desc, asc, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { products, categories, productPhotos } from '@/db/schema'

export interface CatalogQuery {
  category?: string // slug
  search?: string
  minPrice?: number
  maxPrice?: number
  materials?: string[] // CSV распаршен
  styles?: string[]
  sizes?: Array<'small' | 'medium' | 'large'>
  sort?: 'popular' | 'price-asc' | 'price-desc'
  page?: number
  perPage?: number
}

export interface CatalogItem {
  id: string
  sku: string
  title_ru: string
  price_rub: number
  size_bucket: 'small' | 'medium' | 'large'
  dimensions: {
    length_cm: number | null
    width_cm: number | null
    height_cm: number | null
  }
  moq: string | null
  material: string | null
  style: string | null
  category: { slug: string; name_ru: string }
  photos: Array<{ url: string }>
}

export interface CatalogResult {
  items: CatalogItem[]
  total: number
  page: number
  per_page: number
  filters: {
    materials: Array<{ value: string | null; count: number }>
    styles: Array<{ value: string | null; count: number }>
    sizes: Array<{ value: string; count: number }>
    price_range: { min: number; max: number }
  }
  category: { slug: string; name_ru: string } | null
}

export async function queryCatalog(q: CatalogQuery): Promise<CatalogResult> {
  const page = Math.max(1, q.page ?? 1)
  const perPage = Math.max(1, Math.min(60, q.perPage ?? 24))

  // Базовые условия: только активные
  const conditions: SQL[] = [eq(products.status, 'active')]

  // Категория (резолвим slug → id)
  let categoryRecord: { id: string; nameRu: string; slug: string } | null = null
  if (q.category) {
    const [cat] = await db
      .select({ id: categories.id, nameRu: categories.nameRu, slug: categories.slug })
      .from(categories)
      .where(eq(categories.slug, q.category))
      .limit(1)
    if (cat) {
      categoryRecord = cat
      conditions.push(eq(products.categoryId, cat.id))
    } else {
      // Нет такой категории → пустой ответ
      return {
        items: [],
        total: 0,
        page,
        per_page: perPage,
        filters: { materials: [], styles: [], sizes: [], price_range: { min: 0, max: 0 } },
        category: null,
      }
    }
  }

  if (q.minPrice !== undefined) conditions.push(gte(products.priceRub, String(q.minPrice)))
  if (q.maxPrice !== undefined) conditions.push(lte(products.priceRub, String(q.maxPrice)))

  if (q.materials && q.materials.length > 0) {
    conditions.push(inArray(products.material, q.materials))
  }
  if (q.styles && q.styles.length > 0) {
    conditions.push(inArray(products.style, q.styles))
  }
  if (q.sizes && q.sizes.length > 0) {
    conditions.push(inArray(products.sizeBucket, q.sizes))
  }

  // Поиск: full-text + ILIKE fallback
  if (q.search) {
    const clean = q.search.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim()
    if (clean.length > 0) {
      const tsquery = clean.split(/\s+/).filter(Boolean).join(' & ')
      conditions.push(
        sql`(
          to_tsvector('russian',
            coalesce(${products.titleRu}, '') || ' ' ||
            coalesce(${products.description}, '') || ' ' ||
            coalesce(${products.material}, '') || ' ' ||
            coalesce(${products.style}, '')
          ) @@ to_tsquery('russian', ${tsquery})
          OR ${products.titleRu} ILIKE ${'%' + clean + '%'}
        )`
      )
    }
  }

  const whereClause = and(...conditions)

  // Сортировка
  let orderBy
  if (q.sort === 'price-asc') orderBy = [asc(products.priceRub)]
  else if (q.sort === 'price-desc') orderBy = [desc(products.priceRub)]
  else orderBy = [desc(products.sortScore), desc(products.createdAt)]

  const offset = (page - 1) * perPage

  // Основная выборка
  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      titleRu: products.titleRu,
      priceRub: products.priceRub,
      sizeBucket: products.sizeBucket,
      lengthCm: products.lengthCm,
      widthCm: products.widthCm,
      heightCm: products.heightCm,
      moq: products.moq,
      material: products.material,
      style: products.style,
      categorySlug: categories.slug,
      categoryNameRu: categories.nameRu,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(perPage)
    .offset(offset)

  // Total
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(whereClause)
  const total = totalRow.count

  // Фотки
  const productIds = rows.map((r) => r.id)
  const photos =
    productIds.length > 0
      ? await db
          .select({
            productId: productPhotos.productId,
            url: productPhotos.url,
            sortOrder: productPhotos.sortOrder,
          })
          .from(productPhotos)
          .where(inArray(productPhotos.productId, productIds))
          .orderBy(asc(productPhotos.sortOrder))
      : []

  const photosByProduct = new Map<string, Array<{ url: string }>>()
  for (const p of photos) {
    const arr = photosByProduct.get(p.productId) ?? []
    arr.push({ url: p.url })
    photosByProduct.set(p.productId, arr)
  }

  // Фасеты — учитывают категорию, но не учитывают сам фильтр (для UX «попробовать другой материал»)
  const facetBase: SQL[] = [eq(products.status, 'active')]
  if (categoryRecord) facetBase.push(eq(products.categoryId, categoryRecord.id))

  const materials = await db
    .select({ value: products.material, count: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...facetBase, sql`${products.material} IS NOT NULL`))
    .groupBy(products.material)
    .orderBy(desc(sql`count(*)`))
    .limit(15)

  const styles = await db
    .select({ value: products.style, count: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...facetBase, sql`${products.style} IS NOT NULL`))
    .groupBy(products.style)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

  const sizesRaw = await db
    .select({ value: products.sizeBucket, count: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...facetBase))
    .groupBy(products.sizeBucket)

  const [priceRange] = await db
    .select({
      min: sql<number>`coalesce(min(${products.priceRub}), 0)::int`,
      max: sql<number>`coalesce(max(${products.priceRub}), 0)::int`,
    })
    .from(products)
    .where(and(...facetBase))

  return {
    items: rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      title_ru: r.titleRu,
      price_rub: Number(r.priceRub),
      size_bucket: r.sizeBucket,
      dimensions: {
        length_cm: r.lengthCm !== null ? Number(r.lengthCm) : null,
        width_cm: r.widthCm !== null ? Number(r.widthCm) : null,
        height_cm: r.heightCm !== null ? Number(r.heightCm) : null,
      },
      moq: r.moq,
      material: r.material,
      style: r.style,
      category: { slug: r.categorySlug, name_ru: r.categoryNameRu },
      photos: photosByProduct.get(r.id) ?? [],
    })),
    total,
    page,
    per_page: perPage,
    filters: {
      materials,
      styles,
      sizes: sizesRaw,
      price_range: priceRange,
    },
    category: categoryRecord
      ? { slug: categoryRecord.slug, name_ru: categoryRecord.nameRu }
      : null,
  }
}
