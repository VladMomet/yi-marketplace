/**
 * /catalog — общий каталог.
 *
 * SSR. Фильтры читаются из URL (searchParams).
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { queryCatalog } from '@/lib/queries/catalog'
import { CatalogView } from './_components/catalog-view'
import { parseCatalogSearchParams } from './_components/parse-params'

export const metadata: Metadata = {
  title: 'Каталог · мебель из Китая оптом',
  description:
    'B2B-каталог мебели из Китая. Прозрачная цена с доставкой, ВЭД и документы. Фильтры по категории, цене, материалу.',
}

// Re-render при изменении searchParams; на CDN кешируем минуту для скорости back/forward
export const revalidate = 60

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const query = parseCatalogSearchParams(sp)
  const data = await queryCatalog(query)

  return (
    <>
      {/* Хлебные крошки + заголовок */}
      <section className="border-b border-hair bg-paper">
        <div className="container mx-auto max-w-[1480px] px-6 py-10 lg:px-8 lg:py-14">
          <nav aria-label="Хлебные крошки" className="mb-5 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
            <Link href="/" className="hover:text-ink transition-colors">Главная</Link>
            <span className="mx-2">·</span>
            <span className="text-ink">Каталог</span>
          </nav>

          <h1 className="font-display text-4xl font-light tracking-tight md:text-5xl lg:text-[64px]">
            {query.search ? (
              <>
                Поиск:{' '}
                <em className="italic font-light text-cinnabar">«{query.search}»</em>
              </>
            ) : (
              <>Каталог мебели</>
            )}
          </h1>
          <p className="mt-3 text-base text-ink-3">
            Все 21 категории · цена с доставкой · документы
          </p>
        </div>
      </section>

      <CatalogView data={data} />
    </>
  )
}
