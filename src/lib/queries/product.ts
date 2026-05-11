/**
 * getProductDetail — детальная информация о товаре по SKU.
 *
 * Используется и API-ручкой /api/products/[sku], и server component'ом
 * страницы /product/[sku].
 *
 * Возвращает null если не найден или архивирован — server component покажет 404 / 410.
 */

import { eq, asc } from 'drizzle-orm'
import { db } from '@/db'
import { products, productPhotos, categories, cities } from '@/db/schema'
import { calculateFullPrice } from '@/lib/pricing'

export interface ProductDetail {
  id: string
  sku: string
  title_ru: string
  title_cn: string | null
  description: string | null
  status: 'active' | 'archived'
  photos: Array<{ url: string; sortOrder: number; isMain: boolean }>
  price: {
    rub: number
    cny: number
    breakdown: { factory: number; logistics: number; customs: number; vat: number }
  }
  category: { slug: string; name_ru: string }
  size_bucket: 'small' | 'medium' | 'large'
  dimensions: { length_cm: number | null; width_cm: number | null; height_cm: number | null }
  moq: string | null
  material: string | null
  style: string | null
  color: string | null
  source_url: string
  delivery: {
    city: { id: string; slug: string; name_ru: string; name_acc: string | null }
    days_min: number
    days_max: number
  } | null
}

export async function getProductDetail(
  sku: string,
  citySlug?: string
): Promise<ProductDetail | null> {
  const [productRow] = await db
    .select({
      id: products.id,
      sku: products.sku,
      titleRu: products.titleRu,
      titleCn: products.titleCn,
      description: products.description,
      sizeBucket: products.sizeBucket,
      priceCnyWholesale: products.priceCnyWholesale,
      priceRub: products.priceRub,
      moq: products.moq,
      lengthCm: products.lengthCm,
      widthCm: products.widthCm,
      heightCm: products.heightCm,
      material: products.material,
      style: products.style,
      color: products.color,
      sourceUrl: products.sourceUrl,
      status: products.status,
      categorySlug: categories.slug,
      categoryNameRu: categories.nameRu,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.sku, sku))
    .limit(1)

  if (!productRow) return null

  // Фотки
  const photos = await db
    .select({
      url: productPhotos.url,
      sortOrder: productPhotos.sortOrder,
      isMain: productPhotos.isMain,
    })
    .from(productPhotos)
    .where(eq(productPhotos.productId, productRow.id))
    .orderBy(asc(productPhotos.sortOrder))

  // Город
  let city
  if (citySlug) {
    const [c] = await db.select().from(cities).where(eq(cities.slug, citySlug)).limit(1)
    city = c
  }
  if (!city) {
    const [c] = await db.select().from(cities).where(eq(cities.isDefault, true)).limit(1)
    city = c
  }

  const priceRub = Number(productRow.priceRub)
  const priceCny = Number(productRow.priceCnyWholesale)
  const fullPrice = calculateFullPrice(priceRub, priceCny)

  return {
    id: productRow.id,
    sku: productRow.sku,
    title_ru: productRow.titleRu,
    title_cn: productRow.titleCn,
    description: productRow.description,
    status: productRow.status,
    photos,
    price: {
      rub: fullPrice.rub,
      cny: fullPrice.cny,
      breakdown: fullPrice.breakdown,
    },
    category: { slug: productRow.categorySlug, name_ru: productRow.categoryNameRu },
    size_bucket: productRow.sizeBucket,
    dimensions: {
      length_cm: productRow.lengthCm !== null ? Number(productRow.lengthCm) : null,
      width_cm: productRow.widthCm !== null ? Number(productRow.widthCm) : null,
      height_cm: productRow.heightCm !== null ? Number(productRow.heightCm) : null,
    },
    moq: productRow.moq,
    material: productRow.material,
    style: productRow.style,
    color: productRow.color,
    source_url: productRow.sourceUrl,
    delivery: city
      ? {
          city: { id: city.id, slug: city.slug, name_ru: city.nameRu, name_acc: city.nameAcc },
          days_min: city.daysMin,
          days_max: city.daysMax,
        }
      : null,
  }
}
