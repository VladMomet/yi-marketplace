/**
 * Specifications — таблица характеристик товара.
 *
 * Server-component. Все пропуски заменяются на «уточните у менеджера»
 * (как обещано в брифе 2.4).
 */

import { valueOrUnclear } from '@/lib/utils'
import { SIZE_BUCKET_LABELS } from '@/lib/constants'

interface Props {
  sizeBucket: 'small' | 'medium' | 'large'
  dimensions: {
    length_cm: number | null
    width_cm: number | null
    height_cm: number | null
  }
  material: string | null
  style: string | null
  color: string | null
  moq: string | null
  sku: string
}

function dimensionsToText(d: Props['dimensions']): string | null {
  const parts = [d.length_cm, d.width_cm, d.height_cm].filter((v) => v !== null) as number[]
  if (parts.length === 0) return null
  return parts.map((v) => Math.round(v)).join('×') + ' см'
}

export function Specifications({
  sizeBucket,
  dimensions,
  material,
  style,
  color,
  moq,
  sku,
}: Props) {
  const dimText = dimensionsToText(dimensions)
  const sizeLabel = SIZE_BUCKET_LABELS[sizeBucket]

  const rows: Array<{ label: string; value: string }> = [
    {
      label: 'Размер',
      value: dimText ? `${dimText} · ${sizeLabel}` : sizeLabel,
    },
    { label: 'Материал', value: valueOrUnclear(material) },
    { label: 'Стиль', value: valueOrUnclear(style) },
    { label: 'Цвет', value: valueOrUnclear(color) },
    { label: 'MOQ (минимальная партия)', value: valueOrUnclear(moq) },
    { label: 'Артикул', value: sku },
  ]

  return (
    <section>
      <h2 className="mb-5 font-display text-xl font-medium tracking-tight">
        Характеристики
      </h2>
      <dl className="divide-y divide-hair">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[160px_1fr] gap-4 py-3.5 lg:grid-cols-[200px_1fr]"
          >
            <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
              {row.label}
            </dt>
            <dd className="text-sm text-ink-2">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
