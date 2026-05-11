/**
 * HeroSection — главный экран сайта.
 *
 * Берёт 4 случайных фото из БД для коллажа, чтобы было «живо».
 * SSR — данные приходят из server component (page.tsx).
 */

import Link from 'next/link'

interface HeroPhoto {
  url: string
  alt: string
}

interface Props {
  totalProducts: number
  totalCategories: number
  photos: HeroPhoto[]
}

function buildProxyUrl(url: string): string {
  if (url.startsWith('https://cbu')) {
    return `/api/img-proxy?url=${encodeURIComponent(url)}`
  }
  return url
}

export function HeroSection({ totalProducts, totalCategories, photos }: Props) {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="container mx-auto max-w-[1480px] px-6 pt-16 pb-12 lg:px-8 lg:pt-24 lg:pb-20">
        <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          {/* Левый блок: заголовок и CTA */}
          <div>
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-hair bg-surface-hi px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-2 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-cinnabar animate-pulse" />
              Каталог · {totalProducts.toLocaleString('ru-RU').replace(/,/g, ' ')} SKU ·{' '}
              {totalCategories} категорий
            </div>

            <h1 className="mb-7 font-display text-[44px] font-light leading-[0.95] tracking-tight md:text-6xl lg:text-[88px] xl:text-[104px]">
              Мебель из{' '}
              <span className="italic font-light text-cinnabar">Китая.</span>
              <br />В{' '}
              <span className="italic font-light text-cinnabar">белую.</span>
            </h1>

            <p className="mb-10 max-w-[540px] text-lg leading-relaxed text-ink-2">
              B2B-каталог фабрик 1688 с прозрачной ценой сразу с доставкой до вашего города,
              ВЭД и полным пакетом документов. Без серых схем, лишних посредников и
              сюрпризов на таможне.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="inline-flex h-14 items-center gap-2 rounded-full bg-ink px-7 text-sm font-semibold text-paper transition-colors hover:bg-cinnabar"
              >
                Открыть каталог
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </Link>
              <Link
                href="/sourcing"
                className="inline-flex h-14 items-center rounded-full border border-ink-2 px-7 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Заказать подбор
              </Link>
            </div>

            <p className="mt-7 max-w-[440px] font-mono text-[11px] uppercase tracking-wider text-ink-3">
              Менеджер свяжется в течение часа. Платёж — через банк после согласования.
            </p>
          </div>

          {/* Правый блок: коллаж из 4 фото */}
          <div className="relative mt-6 grid h-[420px] grid-cols-2 grid-rows-2 gap-3 md:h-[480px] lg:h-[560px] lg:mt-0">
            {photos.slice(0, 4).map((photo, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-xl bg-paper-2 shadow-lift"
                style={{
                  // Лёгкое смещение для лестничного эффекта
                  transform:
                    idx === 0
                      ? 'translateY(-10px)'
                      : idx === 1
                      ? 'translateY(10px)'
                      : idx === 2
                      ? 'translateY(10px)'
                      : 'translateY(-10px)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={buildProxyUrl(photo.url)}
                  alt={photo.alt}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            ))}

            {/* Бейдж: курс */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 transform rounded-full border border-hair bg-surface-hi px-4 py-2 font-mono text-[10.5px] uppercase tracking-wider text-ink shadow-lift">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-cinnabar align-middle" />
              CNY/RUB · 11 ₽
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
