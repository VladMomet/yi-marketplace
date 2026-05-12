/**
 * Импортёр товаров из Excel-файла мебель_1688.xlsx → PostgreSQL.
 *
 * Запуск: npm run import:products
 *
 * Конфигурация через .env: PRODUCTS_XLSX_PATH (по умолчанию ./data/мебель_1688.xlsx)
 *
 * Поведение:
 *  - Проходит по всем строкам листа «Карточки»
 *  - Мерджит товары по offer_id: новые INSERT, существующие UPDATE
 *  - Товары, которых нет в файле, помечает status='archived'
 *  - Импортирует все фотографии (Фото 1–5)
 *  - Логирует прогресс и итог
 *
 * Перед запуском должны быть выполнены:
 *  npm run db:push          (создать таблицы)
 *  npm run seed:categories  (засеять категории)
 */

import ExcelJS from 'exceljs'
import path from 'path'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../src/db'
import { categories, products, productPhotos } from '../src/db/schema'
import { SIZE_BUCKET_MAP, SKU_PREFIX } from '../src/lib/constants'
import { generateSku } from '../src/lib/utils'

const XLSX_PATH = process.env.PRODUCTS_XLSX_PATH ?? './data/мебель_1688.xlsx'

interface ExcelRow {
  no: number | null
  category: string | null
  titleCn: string | null
  titleRu: string | null
  priceCnyWholesale: number | null
  size: string | null
  priceRub: number | null // Цена 1, ₽ — это та цена, которую мы используем
  moq: string | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  material: string | null
  style: string | null
  color: string | null
  photos: string[]
  sourceUrl: string | null
  offerId: string | null
  description: string | null
}

/** Парсит одну строку Excel в типизированный объект */
function parseRow(row: ExcelJS.Row): ExcelRow | null {
  // Колонки по индексу (1-based в ExcelJS):
  // 1 № | 2 Категория | 3 Title (CN) | 4 Title (RU) | 5 Цена опт CNY
  // 6 Цена опт ₽ | 7 Размер | 8-10 Множители | 11 Цена 1, ₽ | 12 Цена 2 | 13 Цена 3
  // 14 MOQ | 15 Длина | 16 Ширина | 17 Высота | 18 Размеры (исходник)
  // 19 Материал | 20 Стиль | 21 Цвет | 22 Цвет (исходник) | 23 Тип/модель
  // 24-28 Фото 1-5 | 29 Поставщик | 30 Город | 31 Провинция | 32 Заказов
  // 33 % повторных | 34 URL карточки | 35 offerId | 36 Качество | 37 Описание

  const get = (col: number): unknown => {
    const cell = row.getCell(col)
    return cell.value
  }

  const getString = (col: number): string | null => {
    const v = get(col)
    if (v === null || v === undefined) return null
    if (typeof v === 'string') return v.trim() || null
    if (typeof v === 'object' && v !== null && 'text' in v) {
      return (v as { text: string }).text.trim() || null
    }
    return String(v).trim() || null
  }

  const getNumber = (col: number): number | null => {
    const v = get(col)
    if (v === null || v === undefined || v === '') return null
    if (typeof v === 'number') return v
    if (typeof v === 'object' && v !== null && 'result' in v) {
      const r = (v as { result: unknown }).result
      return typeof r === 'number' ? r : null
    }
    const n = parseFloat(String(v))
    return Number.isFinite(n) ? n : null
  }

  const no = getNumber(1)
  if (no === null) return null

  const photos: string[] = []
  for (let col = 24; col <= 28; col++) {
    const url = getString(col)
    if (url && url.startsWith('http')) {
      photos.push(url)
    }
  }

  return {
    no,
    category: getString(2),
    titleCn: getString(3),
    titleRu: getString(4),
    priceCnyWholesale: getNumber(5),
    size: getString(7),
    priceRub: getNumber(11), // ← Цена 1, ₽
    moq: getString(14),
    lengthCm: getNumber(15),
    widthCm: getNumber(16),
    heightCm: getNumber(17),
    material: getString(19),
    style: getString(20),
    color: getString(21),
    photos,
    sourceUrl: getString(34),
    offerId: getString(35),
    description: getString(37),
  }
}

async function main() {
  const absolutePath = path.resolve(process.cwd(), XLSX_PATH)
  console.log(`📂 Reading Excel: ${absolutePath}`)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(absolutePath)

  const sheet = workbook.getWorksheet('Карточки') ?? workbook.worksheets[0]
  if (!sheet) {
    console.error('❌ Sheet not found')
    process.exit(1)
  }

  // Загрузить категории в map для быстрого lookup
  const cats = await db.select().from(categories)
  const categoryMap = new Map(cats.map((c) => [c.nameRu, c.id]))
  console.log(`📂 Loaded ${cats.length} categories from DB`)

  // Собираем offer_id всех существующих товаров — чтобы потом архивировать ушедшие
  const existingProducts = await db.select({ offerId: products.offerId }).from(products)
  const existingOfferIds = new Set(existingProducts.map((p) => p.offerId))

  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  const seenOfferIds = new Set<string>()

  const totalRows = sheet.rowCount
  console.log(`📊 Processing ${totalRows - 1} rows...\n`)

  // Проходим со 2-й строки (1-я — заголовок)
  for (let rowIdx = 2; rowIdx <= totalRows; rowIdx++) {
    const row = sheet.getRow(rowIdx)
    const parsed = parseRow(row)

    if (!parsed) {
      skipped++
      continue
    }

    // Базовая валидация
    if (!parsed.offerId || !parsed.category || !parsed.titleRu || parsed.priceRub === null) {
      console.warn(`  ⚠ Row ${rowIdx}: missing required fields (offerId/category/title/price)`)
      skipped++
      continue
    }

    const categoryId = categoryMap.get(parsed.category)
    if (!categoryId) {
      console.warn(`  ⚠ Row ${rowIdx}: unknown category «${parsed.category}»`)
      skipped++
      continue
    }

    const sizeBucket = parsed.size ? SIZE_BUCKET_MAP[parsed.size] : null
    if (!sizeBucket) {
      console.warn(`  ⚠ Row ${rowIdx}: unknown size «${parsed.size}»`)
      skipped++
      continue
    }

    seenOfferIds.add(parsed.offerId)

    if (parsed.no === null) {
      console.warn(`  ⚠ Row ${rowIdx}: missing no field, skipping`)
      skipped++
      continue
    }

    const sku = generateSku(parsed.no)

    const data = {
      offerId: parsed.offerId,
      sku,
      categoryId,
      titleRu: parsed.titleRu.slice(0, 500),
      titleCn: parsed.titleCn?.slice(0, 500) ?? null,
      description: parsed.description ?? null,
      sizeBucket,
      priceCnyWholesale: String(parsed.priceCnyWholesale ?? 0),
      priceRub: String(parsed.priceRub),
      moq: parsed.moq?.slice(0, 50) ?? null,
      lengthCm: parsed.lengthCm !== null ? String(parsed.lengthCm) : null,
      widthCm: parsed.widthCm !== null ? String(parsed.widthCm) : null,
      heightCm: parsed.heightCm !== null ? String(parsed.heightCm) : null,
      material: parsed.material?.slice(0, 300) ?? null,
      style: parsed.style?.slice(0, 300) ?? null,
      color: parsed.color?.slice(0, 100) ?? null,
      sourceUrl: parsed.sourceUrl ?? `https://detail.1688.com/offer/${parsed.offerId}.html`,
      status: 'active' as const,
      updatedAt: new Date(),
    }

    try {
      // Upsert по offer_id
      const isNew = !existingOfferIds.has(parsed.offerId)

      if (isNew) {
        const [inserted] = await db
          .insert(products)
          .values({ ...data, createdAt: new Date() })
          .returning({ id: products.id })

        // Фотки
        if (parsed.photos.length > 0 && inserted) {
          await db.insert(productPhotos).values(
            parsed.photos.map((url, idx) => ({
              productId: inserted.id,
              url,
              sortOrder: idx,
              isMain: idx === 0,
            }))
          )
        }

        created++
      } else {
        const [existing] = await db
          .update(products)
          .set(data)
          .where(eq(products.offerId, parsed.offerId))
          .returning({ id: products.id })

        // Обновление фоток: чтобы не плодить — удалить и заново вставить
        if (existing) {
          await db.delete(productPhotos).where(eq(productPhotos.productId, existing.id))
          if (parsed.photos.length > 0) {
            await db.insert(productPhotos).values(
              parsed.photos.map((url, idx) => ({
                productId: existing.id,
                url,
                sortOrder: idx,
                isMain: idx === 0,
              }))
            )
          }
        }

        updated++
      }

      // Прогресс каждые 100 строк
      if ((created + updated) % 100 === 0) {
        console.log(`  ... processed ${created + updated} / ${totalRows - 1}`)
      }
    } catch (e) {
      errors++
      console.error(`  ✗ Row ${rowIdx} (offerId ${parsed?.offerId ?? 'unknown'}):`, (e as Error).message)
    }
  }

  // Архивируем товары, которых нет в файле
  const toArchive = [...existingOfferIds].filter((oid) => !seenOfferIds.has(oid))
  let archived = 0
  if (toArchive.length > 0) {
    const result = await db
      .update(products)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(inArray(products.offerId, toArchive))
      .returning({ id: products.id })
    archived = result.length
  }

  console.log('\n══════════════════════════════════════════')
  console.log('✅ Import finished')
  console.log(`  Created:  ${created}`)
  console.log(`  Updated:  ${updated}`)
  console.log(`  Archived: ${archived}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Errors:   ${errors}`)
  console.log('══════════════════════════════════════════\n')

  process.exit(errors > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('❌ Import failed:', e)
  process.exit(1)
})
