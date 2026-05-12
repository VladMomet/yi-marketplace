/**
 * Telegram-уведомления менеджеру.
 *
 * Это весь "бэк-офис" — менеджер получает заказы и заявки в Telegram и работает оттуда.
 * Никакой веб-админки в MVP нет.
 *
 * Все вызовы делаются ПОСЛЕ успешного сохранения в БД. Если Telegram упал —
 * заказ всё равно создан, ошибка только логируется.
 */

import { formatRub, pluralize } from './utils'

const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TG_CHAT_ID = process.env.TELEGRAM_MANAGER_CHAT_ID

const TG_API = TG_BOT_TOKEN ? `https://api.telegram.org/bot${TG_BOT_TOKEN}` : ''

/** Полезная нагрузка для уведомления о новом заказе */
export interface OrderNotificationPayload {
  number: string // YI-238472
  userName: string
  userPhone: string
  userType: 'physical' | 'legal'
  companyName?: string
  companyInn?: string
  cityName: string
  comment?: string | null
  items: Array<{
    title: string
    qty: number
    unitPriceRub: number
    totalPriceRub: number
    url1688: string
  }>
  totalRub: number
}

/** Полезная нагрузка для уведомления о заявке на подбор */
export interface SourcingNotificationPayload {
  number: string // SRC-654321
  userName: string
  userPhone: string
  /** Физ или юр лицо. Для юр — также передаются companyName и companyInn. */
  userType: 'physical' | 'legal'
  companyName?: string | null
  companyInn?: string | null
  /** Город доставки (для понимания логистики при подборе) */
  cityName: string
  description: string
  qty: number
  budgetRub?: number | null
  /**
   * Фото-референсы в виде буферов. Загружаются прямо в Telegram через
   * multipart (без S3 — экономим инфру в MVP).
   */
  photos: Array<{
    buffer: Buffer
    filename: string
    contentType: string
  }>
}

/**
 * Отправляет произвольное текстовое сообщение менеджеру.
 * Возвращает true, если отправлено успешно.
 */
async function sendMessage(text: string): Promise<boolean> {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
    console.warn('[Telegram] Bot token or chat ID not configured. Skipping notification.')
    return false
  }

  try {
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text,
        disable_web_page_preview: false, // нам нужны превью ссылок 1688
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[Telegram] sendMessage failed:', res.status, body)
      return false
    }
    return true
  } catch (e) {
    console.error('[Telegram] sendMessage exception:', e)
    return false
  }
}

/** Отправляет одно фото по URL */
async function sendPhotoFromUrl(photoUrl: string, caption?: string): Promise<boolean> {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return false

  try {
    const res = await fetch(`${TG_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        photo: photoUrl,
        caption,
      }),
    })
    return res.ok
  } catch (e) {
    console.error('[Telegram] sendPhoto exception:', e)
    return false
  }
}

/**
 * Отправляет фото прямо из буфера (multipart/form-data).
 * Используется для фото-референсов в заявках на подбор — мы шлём их
 * напрямую в Telegram без промежуточного S3-хранилища.
 *
 * Лимит Telegram: 10 МБ на одно фото.
 */
async function sendPhotoBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string,
  caption?: string
): Promise<boolean> {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
    console.warn('[Telegram] Bot not configured, skip photo')
    return false
  }

  try {
    const form = new FormData()
    form.append('chat_id', TG_CHAT_ID)
    if (caption) form.append('caption', caption)
    // Blob доступен глобально в Node.js 18+ и Vercel runtime
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType })
    form.append('photo', blob, filename)

    const res = await fetch(`${TG_API}/sendPhoto`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[Telegram] sendPhotoBuffer failed:', res.status, text)
    }
    return res.ok
  } catch (e) {
    console.error('[Telegram] sendPhotoBuffer exception:', e)
    return false
  }
}

/**
 * Уведомление о новом заказе.
 *
 * Визуально отличается от заявки на подбор зелёной «полосой» в шапке
 * (деньги → зелёный). См. notifyNewSourcing для контраста (жёлтый).
 */
export async function notifyNewOrder(payload: OrderNotificationPayload): Promise<void> {
  const lines: string[] = []
  // Шапка-разделитель: зелёная полоса = заказ (деньги в кассе)
  lines.push('🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢')
  lines.push(`💰 НОВЫЙ ЗАКАЗ — ${payload.number}`)
  lines.push('🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢')
  lines.push('')

  // Клиент
  if (payload.userType === 'legal' && payload.companyName) {
    lines.push(`👤 ${payload.userName} (${payload.companyName})`)
    if (payload.companyInn) lines.push(`🏢 ИНН: ${payload.companyInn}`)
  } else {
    lines.push(`👤 ${payload.userName} (физ. лицо)`)
  }
  lines.push(`📱 ${payload.userPhone}`)
  lines.push(`🏙 Доставка: ${payload.cityName}`)
  lines.push('')

  // Состав
  const positionWord = pluralize(payload.items.length, 'позиция', 'позиции', 'позиций')
  const totalUnits = payload.items.reduce((s, i) => s + i.qty, 0)
  const unitWord = pluralize(totalUnits, 'шт', 'шт', 'шт')
  lines.push(`📦 Состав (${payload.items.length} ${positionWord}, ${totalUnits} ${unitWord}):`)
  lines.push('')

  payload.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.title}`)
    lines.push(
      `   ${item.qty} шт × ${formatRub(item.unitPriceRub)} = ${formatRub(item.totalPriceRub)}`
    )
    lines.push(`   ${item.url1688}`)
    lines.push('')
  })

  lines.push(`💰 ИТОГО: ${formatRub(payload.totalRub)}`)

  if (payload.comment) {
    lines.push('')
    lines.push(`💬 Комментарий клиента: «${payload.comment}»`)
  }

  await sendMessage(lines.join('\n'))
}

/**
 * Уведомление о новой заявке на подбор.
 *
 * Формат (см. бриф 7.3):
 * 🔍 ПОДБОР — SRC-654321
 * 👤 Мария Сидорова
 * 📱 +7 999 987-65-43
 * 📝 Описание: ...
 * 📊 Кол-во: 50 шт
 * 💰 Бюджет: 4 000 ₽/шт
 *
 * Затем отдельными сообщениями отправляются фото-референсы.
 */
/**
 * Уведомление о новой заявке на подбор.
 *
 * Визуально отличается от заказа жёлтой «полосой» в шапке
 * (задача предстоит → жёлтый). Это помогает менеджеру быстро различать
 * типы сообщений в общем потоке Telegram-канала.
 *
 * Затем отдельными сообщениями отправляются фото-референсы.
 */
export async function notifyNewSourcing(payload: SourcingNotificationPayload): Promise<void> {
  const lines: string[] = []
  // Шапка-разделитель: жёлтая полоса = подбор (нужна работа сотрудника в Иу)
  lines.push('🟡🟡🟡🟡🟡🟡🟡🟡🟡🟡')
  lines.push(`🔍 ЗАЯВКА НА ПОДБОР — ${payload.number}`)
  lines.push('🟡🟡🟡🟡🟡🟡🟡🟡🟡🟡')
  lines.push('')

  // Клиент — с типом физ/юр (как у заказов)
  if (payload.userType === 'legal' && payload.companyName) {
    lines.push(`👤 ${payload.userName} (${payload.companyName})`)
    if (payload.companyInn) lines.push(`🏢 ИНН: ${payload.companyInn}`)
  } else {
    lines.push(`👤 ${payload.userName} (физ. лицо)`)
  }
  lines.push(`📱 ${payload.userPhone}`)
  lines.push(`🏙 Доставка: ${payload.cityName}`)
  lines.push('')

  lines.push('📝 Описание:')
  lines.push(payload.description)
  lines.push('')

  lines.push(`📊 Кол-во: ${payload.qty} шт`)
  if (payload.budgetRub) {
    lines.push(`💰 Бюджет: ${formatRub(payload.budgetRub)}/шт`)
  }

  await sendMessage(lines.join('\n'))

  // Шлём фото-референсы как multipart прямо в Telegram (без S3)
  for (let i = 0; i < payload.photos.length; i++) {
    const photo = payload.photos[i]
    await sendPhotoBuffer(
      photo.buffer,
      photo.filename,
      photo.contentType,
      `📎 Референс ${i + 1}/${payload.photos.length} к заявке ${payload.number}`
    )
  }
}

/**
 * Generic helper — для отладки или служебных сообщений.
 */
export async function notifyText(text: string): Promise<boolean> {
  return sendMessage(text)
}
