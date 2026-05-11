/**
 * Сид категорий каталога.
 *
 * Запуск: npm run seed:categories
 *
 * Идемпотентен.
 */

import { db } from '../src/db'
import { categories } from '../src/db/schema'
import { slugify } from '../src/lib/utils'

const SEED = [
  'ТВ-тумба',
  'Книжный стеллаж',
  'Мебель садовая',
  'Стол обеденный',
  'Комод',
  'Прикроватная тумба',
  'Шкаф',
  'Торшер',
  'Стол письменный',
  'Зеркало напольное',
  'Обувница',
  'Кровать двуспальная',
  'Стол журнальный',
  'Кресло компьютерное',
  'Диван',
  'Пуф',
  'Стул обеденный',
  'Настенная полка',
  'Кровать',
  'Стеллаж-органайзер',
  'Кресло',
]

// Хардкод slug, чтобы они были стабильны и пригодны для SEO URL
const SLUG_OVERRIDES: Record<string, string> = {
  'ТВ-тумба': 'tv-stands',
  'Книжный стеллаж': 'bookshelves',
  'Мебель садовая': 'garden',
  'Стол обеденный': 'dining-tables',
  'Комод': 'dressers',
  'Прикроватная тумба': 'nightstands',
  'Шкаф': 'wardrobes',
  'Торшер': 'floor-lamps',
  'Стол письменный': 'desks',
  'Зеркало напольное': 'mirrors',
  'Обувница': 'shoe-cabinets',
  'Кровать двуспальная': 'double-beds',
  'Стол журнальный': 'coffee-tables',
  'Кресло компьютерное': 'office-chairs',
  'Диван': 'sofas',
  'Пуф': 'poufs',
  'Стул обеденный': 'dining-chairs',
  'Настенная полка': 'wall-shelves',
  'Кровать': 'beds',
  'Стеллаж-органайзер': 'organizers',
  'Кресло': 'armchairs',
}

async function main() {
  console.log('🌱 Seeding categories...')

  for (let i = 0; i < SEED.length; i++) {
    const nameRu = SEED[i]
    const slug = SLUG_OVERRIDES[nameRu] ?? slugify(nameRu)

    await db
      .insert(categories)
      .values({ slug, nameRu, sortOrder: i + 1, isActive: true })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { nameRu, sortOrder: i + 1, isActive: true },
      })

    console.log(`  ✓ ${nameRu} (${slug})`)
  }

  console.log(`\n✅ Categories seeded: ${SEED.length}\n`)
  process.exit(0)
}

main().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
