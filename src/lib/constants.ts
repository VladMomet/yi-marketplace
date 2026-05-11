/**
 * Глобальные константы Yí marketplace.
 *
 * Эти значения захардкожены в коде согласно решениям MVP (см. бриф разделы 2.2, 2.3, 4.4).
 * В будущих версиях вынесем в таблицу settings и админку.
 */

/** Курс юаня к рублю — используется для отображения справочной CNY-цены */
export const CNY_TO_RUB = 11

/**
 * Приблизительная разбивка финальной цены для образовательной декомпозиции
 * в карточке товара. Не точный расчёт — реальное распределение варьируется.
 * Сумма должна быть 100.
 */
export const COST_BREAKDOWN = {
  factory: 55, // фабрика
  logistics: 25, // логистика Иу/Гуанчжоу → РФ
  customs: 3, // ВЭД, таможня, сертификация
  vat: 17, // НДС 20% (приблизительно)
} as const

/** Текст-заглушка для отсутствующих полей в карточке товара */
export const UNCLEAR_VALUE_LABEL = 'уточните у менеджера'

/** Лимит на размер фото-референса в подборе */
export const SOURCING_PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/** Лимит количества фото в подборе */
export const SOURCING_PHOTOS_MAX_COUNT = 3

/** Минимальная длина пароля */
export const PASSWORD_MIN_LENGTH = 6

/** Минимальная длина описания в заявке на подбор */
export const SOURCING_DESCRIPTION_MIN_LENGTH = 20

/** Bcrypt cost (12 — оптимальный баланс безопасности и скорости в 2025) */
export const BCRYPT_COST = 12

/** Префикс SKU */
export const SKU_PREFIX = 'YI'

/** Префиксы номеров для заказов и подбора */
export const ORDER_NUMBER_PREFIX = 'YI'
export const SOURCING_NUMBER_PREFIX = 'SRC'

/** Юр.лицо для футера, документов, контактов */
export const LEGAL_ENTITY = {
  type: 'ИП',
  name: 'Оболенский Владимир',
  fullName: 'ИП Оболенский Владимир',
  // Заглушки — заменить перед запуском
  inn: '[указать перед запуском]',
  ogrn: '[указать перед запуском]',
  email: 'privacy@yi-opt.ru',
  phone: '+7 (495) 123-45-67',
} as const

/** Карта Excel-бакетов к нашему enum */
export const SIZE_BUCKET_MAP: Record<string, 'small' | 'medium' | 'large'> = {
  Маленькая: 'small',
  Средняя: 'medium',
  Крупная: 'large',
}

/** Карта enum к человекочитаемому в UI */
export const SIZE_BUCKET_LABELS = {
  small: 'Маленькая',
  medium: 'Средняя',
  large: 'Крупная',
} as const
