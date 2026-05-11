# Yí — Технический бриф (финальная версия)

**Проект:** B2B-маркетплейс мебели «Yí» (Китай → Россия)
**Версия:** 2.0 (финальная, все ключевые решения приняты)
**Назначение:** Этот документ — техническое задание и одновременно промт для AI-генератора кода (Cursor, Claude Code и т.п.). Документ самодостаточен.

---

## 0. Главное в одном абзаце

Мы строим B2B-маркетплейс мебели «Yí» для российских селлеров и оптовиков. Витрина наполняется реальными карточками с китайской 1688 (1951 товар, 21 категория), но российский покупатель видит уже переведённую карточку с прозрачной итоговой ценой включая логистику, ВЭД и НДС. После оформления заказа все данные падают в Telegram менеджера — он сам связывается с клиентом и закрывает сделку. **Веб-админки нет.** Платежей на сайте нет (через банк после согласования). Серверы в РФ (152-ФЗ). Стек: Next.js 15 + TypeScript + PostgreSQL + Drizzle ORM + Tailwind + Auth.js.

---

## 1. Бизнес-контекст

### 1.1. УТП (три обещания)

1. **Прозрачная цена сразу с доставкой.** В каждой карточке — итоговая сумма за единицу до Москвы.
2. **«В белую» с пакетом документов.** Контракт, инвойс, ДТ, сертификаты, счёт-фактура с НДС, ТТН.
3. **Прямые фабрики 1688 + наши люди в Иу и Гуанчжоу.** Если в каталоге нет — заявка на подбор, ответ за 24 часа.

### 1.2. ЦА

1. Селлеры маркетплейсов (Wildberries, Ozon, Яндекс.Маркет)
2. Оптовики и закупщики для офлайн-магазинов и проектов
3. Дизайнеры/архитекторы интерьеров

### 1.3. Юридическое лицо

**ИП Оболенский Владимир.** Используется везде в футере, контактах, политике конфиденциальности, оферте. ОГРНИП и ИНН — заглушки в MVP, заменяются на реальные перед запуском.

---

## 2. Источник данных и логика цены

### 2.1. Файл

`мебель_1688.xlsx`: 1951 товар, 21 категория, 37 столбцов.

**21 категория** (с количеством):
ТВ-тумба (128), Книжный стеллаж (121), Мебель садовая (120), Стол обеденный (116), Комод (105), Прикроватная тумба (101), Шкаф (98), Торшер (98), Стол письменный (98), Зеркало напольное (97), Обувница (95), Кровать двуспальная (95), Стол журнальный (88), Кресло компьютерное (88), Диван (86), Пуф (80), Стул обеденный (77), Настенная полка (73), Кровать (66), Стеллаж-органайзер (65), Кресло (56).

### 2.2. Цена в каталоге

**Берём колонку «Цена 1, ₽» из Excel.** Это уже посчитанная итоговая цена с минимальной наценкой (Опт₽ × множитель тира 1). Множители зашиты в Excel в зависимости от размерного бакета:

| Размер | Множитель тира 1 |
|---|---|
| Маленькая (614 шт) | ×1.5 |
| Средняя (943 шт) | ×1.75 |
| Крупная (394 шт) | ×2.0 |

Курс CNY/RUB — **константа 11 ₽ за юань** в коде (`const CNY_TO_RUB = 11`). При необходимости смены курса — пересчитываем Excel заново и переимпортируем. В MVP курс не меняется.

### 2.3. Визуальная декомпозиция цены (для карточки товара)

В карточке товара показываем приблизительную декомпозицию итоговой цены — это образовательный элемент для прозрачности. Реальное распределение варьируется, но визуально показываем фиксированные доли:

```
Фабрика (опт CNY × 11)         ~55%
Логистика Иу → Москва           ~25%
ВЭД, таможня, сертификация       ~3%
НДС 20%                         ~17%
──────────────────────────────
Итого с доставкой         = Цена 1
```

Эти проценты — константы в коде (`const COST_BREAKDOWN = { factory: 55, logistics: 25, customs: 3, vat: 17 }`).

### 2.4. Обработка пропущенных данных

Многие товары имеют пропуски: ~50% без полных размеров, у части пустой материал, цвет, MOQ. **Правило: где данных нет, в карточке пишем «уточните у менеджера»** (вместо «обсуждается», «варианты по запросу» и т.д.).

---

## 3. Архитектура и стек

### 3.1. Общая схема

```
[Browser]
   ↓
[Next.js App] ─── единое приложение, и фронт, и API
   ├─ Pages: / /catalog /product/[sku] /sourcing /account ...
   └─ API:   /api/auth/* /api/products /api/orders /api/sourcing ...
   ↓
[PostgreSQL — на том же VPS]
   ↑
[S3 / Object Storage] ── для фото-референсов в заявках на подбор
   ↑
[Telegram Bot API] ── уведомления менеджеру (весь «бэк-офис»)
```

### 3.2. Стек

| Слой | Технология | Зачем |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR для SEO, API в одном проекте |
| Язык | TypeScript (strict) | типобезопасность |
| Стили | Tailwind CSS v4 | быстрая разработка, кастомные токены |
| Компоненты | shadcn/ui | копируем в проект и кастомизируем |
| Иконки | lucide-react | стандарт |
| ORM | **Drizzle** | лёгкий, быстрый, ближе к SQL |
| БД | PostgreSQL 16 | реляционные данные |
| Auth | Auth.js v5 (Credentials) | login/logout/сессии |
| Хеширование | bcryptjs (cost 12) | пароли |
| Валидация | Zod | проверка входов на API |
| Картинки | Sharp | ресайз фото-референсов |
| Хранилище | Selectel Object Storage (S3 API) | фото-референсы из подбора |
| Уведомления | Telegram Bot API | весь «бэк-офис» в Telegram |
| Аналитика | Yandex Metrica | метрики |
| Хостинг | Selectel VPS (РФ) | 152-ФЗ |
| HTTPS | Let's Encrypt (через Caddy или Nginx) | бесплатно |

### 3.3. Инфраструктура (бюджет ~2 тыс ₽/мес со стартовой конфигурацией)

| Ресурс | Провайдер | Стоимость |
|---|---|---|
| VPS 2 vCPU / 4 GB RAM / 60 GB SSD | Selectel Cloud (Москва) | ~1500 ₽/мес |
| PostgreSQL | **Установлен на том же VPS** (без managed-сервиса) | 0 ₽ |
| Object Storage (10 GB на старте) | Selectel | ~50 ₽/мес |
| Домен `.ru` | Reg.ru / Beget | ~30 ₽/мес (350 ₽/год) |
| SSL | Let's Encrypt | 0 ₽ |
| Yandex Metrica | Яндекс | 0 ₽ |
| Telegram Bot | Telegram | 0 ₽ |
| **Итого** | | **~1580 ₽/мес** |

Запас бюджета 5 тыс ₽/мес идёт на:
- При росте трафика — апгрейд VPS до 4 vCPU / 8 GB (~3000 ₽/мес)
- Больше места в S3 при росте каталога
- Резерв на мониторинг (uptimerobot и т.п.)

**Бэкапы:** ежедневный `pg_dump` через cron в Object Storage. Хранение 14 дней.

---

## 4. Модель данных

Все таблицы используют UUID id (`gen_random_uuid()`), поля `created_at`/`updated_at` — `timestamptz`.

### 4.1. Пользователи

```sql
CREATE TYPE user_type AS ENUM ('physical', 'legal');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            user_type NOT NULL,
  phone           VARCHAR(20) NOT NULL UNIQUE,
  email           VARCHAR(255) UNIQUE,           -- опционально
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,         -- ФИО или контактное лицо
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_phone_idx ON users(phone);
CREATE INDEX users_email_idx ON users(email) WHERE email IS NOT NULL;

CREATE TABLE companies (
  user_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name      VARCHAR(500) NOT NULL,
  inn       VARCHAR(12) NOT NULL,
  kpp       VARCHAR(9),
  ogrn      VARCHAR(15) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Лог согласий на обработку ПД (требование 152-ФЗ)
CREATE TABLE consents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  consent_type  VARCHAR(50) NOT NULL,        -- 'privacy' | 'offer' | 'cookies'
  consented_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address    INET,
  user_agent    TEXT
);
CREATE INDEX consents_user_idx ON consents(user_id);
```

### 4.2. Каталог

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(100) NOT NULL UNIQUE,
  name_ru     VARCHAR(200) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TYPE size_bucket AS ENUM ('small', 'medium', 'large');
CREATE TYPE product_status AS ENUM ('active', 'archived');

CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id            VARCHAR(50) NOT NULL UNIQUE,   -- offerId с 1688
  sku                 VARCHAR(50) NOT NULL UNIQUE,   -- наш SKU (YI-{number})
  category_id         UUID NOT NULL REFERENCES categories(id),

  -- Тексты
  title_ru            VARCHAR(500) NOT NULL,
  title_cn            VARCHAR(500),
  description         TEXT,                          -- из Excel

  -- Цена и размер
  size_bucket         size_bucket NOT NULL,
  price_cny_wholesale NUMERIC(12,2) NOT NULL,
  price_rub           NUMERIC(12,2) NOT NULL,        -- финальная цена (Цена 1 из Excel)

  -- Спецификации (всё nullable — где пусто, UI пишет "уточните у менеджера")
  moq                 VARCHAR(50),
  length_cm           NUMERIC(6,1),
  width_cm            NUMERIC(6,1),
  height_cm           NUMERIC(6,1),
  material            VARCHAR(300),
  style               VARCHAR(300),
  color               VARCHAR(100),

  -- Метаданные с 1688
  source_url          TEXT NOT NULL,                 -- URL на 1688

  -- Сортировка
  status              product_status NOT NULL DEFAULT 'active',
  sort_score          INT NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products(category_id) WHERE status='active';
CREATE INDEX products_price_idx ON products(price_rub) WHERE status='active';
CREATE INDEX products_search_idx ON products USING GIN(
  to_tsvector('russian',
    coalesce(title_ru,'') || ' ' ||
    coalesce(description,'') || ' ' ||
    coalesce(material,'') || ' ' ||
    coalesce(style,'')
  )
);

CREATE TABLE product_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,                         -- URL c cbu01.alicdn.com
  sort_order  INT NOT NULL DEFAULT 0,
  is_main     BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX product_photos_product_idx ON product_photos(product_id, sort_order);

-- Города доставки (статичный справочник)
CREATE TABLE cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(100) NOT NULL UNIQUE,
  name_ru     VARCHAR(200) NOT NULL,
  name_acc    VARCHAR(200),                          -- винительный для UI: 'в Москву'
  days_min    INT NOT NULL,
  days_max    INT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 0
);
```

### 4.3. Заказы и заявки

```sql
-- Минимальный набор статусов. Без админки изменение статуса делается ручным SQL UPDATE.
CREATE TYPE order_status AS ENUM ('new', 'in_progress', 'completed', 'cancelled');

CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number            VARCHAR(20) NOT NULL UNIQUE,     -- 'YI-123456'
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  delivery_city_id  UUID NOT NULL REFERENCES cities(id),
  status            order_status NOT NULL DEFAULT 'new',
  total_rub         NUMERIC(14,2) NOT NULL,
  units_count       INT NOT NULL,
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON orders(user_id, created_at DESC);
CREATE INDEX orders_number_idx ON orders(number);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty             INT NOT NULL CHECK (qty > 0),
  unit_price_rub  NUMERIC(12,2) NOT NULL,
  total_price_rub NUMERIC(14,2) NOT NULL,
  -- snapshot товара на момент заказа
  snapshot_title    VARCHAR(500) NOT NULL,
  snapshot_photo    TEXT,
  snapshot_sku      VARCHAR(50) NOT NULL,
  snapshot_url_1688 TEXT NOT NULL                    -- ссылка для менеджера
);

CREATE TYPE sourcing_status AS ENUM ('new', 'in_progress', 'completed', 'cancelled');

CREATE TABLE sourcing_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number         VARCHAR(20) NOT NULL UNIQUE,         -- 'SRC-123456'
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description    TEXT NOT NULL,
  qty            INT NOT NULL,
  budget_rub     NUMERIC(12,2),
  status         sourcing_status NOT NULL DEFAULT 'new',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sourcing_request_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES sourcing_requests(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,                         -- URL в нашем S3
  sort_order  INT NOT NULL DEFAULT 0
);
```

### 4.4. Что НЕ хранится в БД (захардкожено в коде)

- Курс CNY/RUB: `const CNY_TO_RUB = 11`
- Проценты декомпозиции: `const COST_BREAKDOWN = { factory: 55, logistics: 25, customs: 3, vat: 17 }`
- Telegram chat_id: `process.env.TELEGRAM_MANAGER_CHAT_ID`
- Telegram bot token: `process.env.TELEGRAM_BOT_TOKEN`

---

## 5. API

REST API под `/api/*`. Все ответы JSON. Ошибки:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {...} } }
```

### 5.1. Аутентификация

```
POST /api/auth/register
Body: {
  type: 'physical' | 'legal',
  phone: string,
  name: string,
  email?: string,
  password: string,
  company?: { name: string, inn: string, kpp?: string, ogrn: string },
  consents: { privacy: true, offer: true }
}
Resp: { user, sessionToken }
Side effect: создаёт users + companies + consents

POST /api/auth/login
Body: { phone, password }
Resp: { user, sessionToken }

POST /api/auth/logout
Resp: { ok: true }

GET /api/auth/me
Resp: { user, company? } | 401
```

### 5.2. Каталог (публичные)

```
GET /api/categories
Resp: [{ id, slug, name_ru, product_count }]

GET /api/cities
Resp: [{ id, slug, name_ru, name_acc, days_min, days_max, is_default }]

GET /api/products?category=tv-stands&min_price=1000&max_price=50000&material=...&style=...&size=small,medium&search=...&sort=price-asc&page=1&per_page=24
Resp: {
  items: [{
    id, sku, slug,
    title_ru, photos: [{url}],
    price_rub,
    category: {slug, name_ru},
    size_bucket,
    dimensions: { length_cm, width_cm, height_cm } | null,
    moq, material, style                // могут быть null → "уточните у менеджера"
  }],
  total, page, per_page,
  filters: {
    materials: [{value, count}],
    styles: [{value, count}],
    sizes: [{value, count}],
    price_range: {min, max}
  }
}

GET /api/products/:sku
Resp: {
  id, sku, title_ru, title_cn, description,
  photos: [{url, sort_order, is_main}],
  price: {
    rub: number,
    cny: number,
    breakdown: { factory, logistics, customs, vat }
  },
  category: {slug, name_ru},
  size_bucket,
  dimensions: { length_cm, width_cm, height_cm } | null,
  moq, material, style, color,
  source_url,
  delivery: { city: {...}, days_min, days_max }
}
```

### 5.3. Заказы

```
POST /api/orders
Auth: required
Body: {
  items: [{ product_id: uuid, qty: int }],
  city_id: uuid,
  comment?: string
}
Resp: { order: { number, total_rub, status: 'new' } }
Side effects:
  1. Создаёт orders + order_items (snapshot товара)
  2. Отправляет Telegram-уведомление менеджеру (см. раздел 7)

GET /api/orders
Auth: required
Resp: [{ number, status, total_rub, units_count, created_at, items: [...] }]

GET /api/orders/:number
Auth: required, ownership check
Resp: { order, items, city }
```

### 5.4. Заявки на подбор

```
POST /api/uploads/sourcing-photo
Auth: optional (можно загружать до регистрации)
Body: multipart/form-data, один файл
Resp: { url, temp_id }                  // временный, привязка при создании заявки

POST /api/sourcing-requests
Auth: required
Body: {
  description: string,
  qty: int,
  budget_rub?: number,
  photo_temp_ids: uuid[]                // до 3
}
Resp: { request: { number, status: 'new' } }
Side effect: Telegram-уведомление + перенос фото из temp в постоянное хранилище

GET /api/sourcing-requests
Auth: required
Resp: [...]
```

### 5.5. Профиль

```
GET /api/users/me/profile
PATCH /api/users/me/profile
POST /api/users/me/change-password
```

---

## 6. Функциональные модули (UI)

### 6.1. Главная (`/`)

1. Header (sticky): лого Yí, навигация (Каталог, Подбор, Доставка, О компании), селектор города, корзина, «Войти»
2. Тикер сверху — курс CNY/RUB, ETA контейнеров, число товаров
3. Hero: «Мебель из *Китая.* В *белую.*», подзаголовок с УТП, две CTA, коллаж из 4 настоящих фото
4. Метрики: 2000+ SKU, 14–45 дней, 21 категория, 100% документы
5. Манифест: 4 пункта УТП с порядковыми номерами
6. Каталог-превью: первые ~24 карточки с фильтрами
7. Sourcing-секция: тёмный фон, форма подбора
8. Footer: лого, разделы, документы, контакты, **«ИП Оболенский Владимир»**

### 6.2. Каталог (`/catalog`, `/catalog/[category]`)

- SSR, фильтры в URL, пагинация (не infinite scroll — плох для SEO)
- Фильтры: поиск, категория, цена min/max, размер, материал, стиль
- Сортировка: популярные / цена ↑ / цена ↓
- Карточка: фото (на ховере — 2-е), pill-тег категории, тень при ховере, цена, кнопка «+ В корзину»

### 6.3. Карточка товара (`/product/[sku]`)

- SSR с meta-тегами и og:image
- Слева: галерея 5 фото, thumbnails
- Справа: категория, заголовок, китайский подзаголовок, **блок цены с раскрывающейся декомпозицией**, блок доставки (с возможностью сменить город), таблица спецификаций (где пусто — «уточните у менеджера»), описание, qty + «+ В корзину», источник 1688

### 6.4. Корзина (drawer справа)

- Состояние в localStorage (синхронизация с БД — в будущей версии)
- Строки: фото, название, qty-stepper, цена, удалить
- Кнопка «Оформить заказ»: гостям — модалка регистрации, авторизованным — сразу создание заказа

### 6.5. Регистрация и оформление заказа

- Toggle «Физическое лицо» / «Юридическое лицо»
- Физлицо: Имя*, Телефон*, Email (опц.)
- Юрлицо: + Наименование*, ИНН*, КПП, ОГРН*
- Пароль* (мин. 6 символов)
- Чекбоксы согласий (политика + оферта) — обязательны
- Если email пустой — предупреждение: «Без email сброс пароля только через менеджера»
- После submit:
  1. `POST /api/auth/register`
  2. `POST /api/orders`
  3. Telegram-уведомление
  4. Success-экран с номером YI-XXXXXX

### 6.6. Личный кабинет (`/account`)

Три вкладки:
- **Заказы:** список с номером, датой, составом, суммой, бейджем статуса
- **Заявки на подбор:** аналогично, с описанием и статусом
- **Контакты:** редактируемая форма, пароль отдельной формой

### 6.7. Персональный подбор (`/sourcing` или секция на главной)

- Текстовое описание (≥20 символов)
- Кол-во штук
- Бюджет за штуку (опц.)
- До 3 фото-референсов
- Submit: гостям — регистрация → создание заявки. Авторизованным — сразу заявка. Telegram-уведомление.

### 6.8. Cookie-баннер

- При первом визите, через 2 сек
- Кнопки: «Принять все» / «Только необходимые»
- До согласия — Yandex Metrica НЕ инициализируется
- Согласие пишется в БД (`consents`)

### 6.9. Юридические страницы

`/legal/privacy`, `/legal/offer`, `/legal/terms` — статичные заглушки (см. 10.2).

---

## 7. Telegram-бот менеджера (ключевая часть!)

**Это весь «бэк-офис».** Менеджер видит заказы и заявки в Telegram и работает оттуда.

### 7.1. Конфигурация

В `.env`:
```bash
TELEGRAM_BOT_TOKEN=8533120323:AAFqwG2u86PkzoHahINNU0f6gEQT-eXyE0c
TELEGRAM_MANAGER_CHAT_ID=8533120323
```

### 7.2. Уведомление о новом заказе

Срабатывает в `POST /api/orders` после успешной записи в БД. Формат:

```
🆕 НОВЫЙ ЗАКАЗ — YI-238472

👤 Иван Петров (физ. лицо)
📱 +7 999 123-45-67
🏙 Доставка: Москва

📦 Состав (2 позиции, 5 шт):

1. Северо-европейская ТВ-тумба, цвет дуб
   2 шт × 4 500 ₽ = 9 000 ₽
   https://detail.1688.com/offer/744816536562.html

2. Стол журнальный, минимализм, белый
   3 шт × 2 800 ₽ = 8 400 ₽
   https://detail.1688.com/offer/655443211234.html

💰 ИТОГО: 17 400 ₽

💬 Комментарий клиента: «Хочу обсудить цвет»
```

Для юрлица — дополнительно строки с ИНН и наименованием компании.

### 7.3. Уведомление о новой заявке на подбор

Срабатывает в `POST /api/sourcing-requests`:

```
🔍 ПОДБОР — SRC-654321

👤 Мария Сидорова
📱 +7 999 987-65-43

📝 Описание:
Журнальный столик из массива дуба, диаметр 80-90 см,
в скандинавском стиле, MOQ от 20 штук. Готов рассмотреть похожие.

📊 Кол-во: 50 шт
💰 Бюджет: 4 000 ₽/шт
```

Если есть фото-референсы — отправляются следом отдельными сообщениями через `sendPhoto` (или `sendMediaGroup` для нескольких сразу).

### 7.4. Реализация (TypeScript-набросок)

```typescript
// lib/telegram.ts
const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const CHAT_ID = process.env.TELEGRAM_MANAGER_CHAT_ID!

async function sendMessage(text: string) {
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      disable_web_page_preview: false,    // нам нужны превью ссылок 1688
    })
  })
  if (!res.ok) console.error('Telegram error:', await res.text())
}

async function sendPhotoFromUrl(photoUrl: string, caption?: string) {
  await fetch(`${TG_API}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, photo: photoUrl, caption })
  })
}

export async function notifyNewOrder(order: OrderWithDetails) { /* формирует текст */ }
export async function notifyNewSourcing(request: SourcingRequestWithDetails) { /* ... */ }
```

**Важно:** все вызовы Telegram идут **после** успешного сохранения в БД. Если Telegram упадёт — заказ всё равно создан, логируем ошибку, менеджер потом видит в SQL `SELECT * FROM orders WHERE status='new'`.

---

## 8. Импорт данных из Excel

### 8.1. Скрипт первичной загрузки

`scripts/import-products.ts` — запускается один раз при первоначальном наполнении БД:

```typescript
// 1. Открываем xlsx через exceljs (поддерживает чтение)
// 2. Для каждой строки:
//    a. Найти/создать category по name_ru
//    b. Сгенерировать sku: `YI-${row['№'].toString().padStart(5,'0')}`
//    c. Маппинг полей:
//       - title_ru, title_cn, description — как в Excel
//       - price_rub = row['Цена 1, ₽']
//       - price_cny_wholesale = row['Цена опт CNY']
//       - size_bucket: 'Маленькая' → 'small', 'Средняя' → 'medium', 'Крупная' → 'large'
//       - length/width/height — nullable
//       - material, style, color — если пусто, null (UI покажет "уточните у менеджера")
//       - moq — nullable
//       - source_url, offer_id — обязательны
//    d. INSERT в products
//    e. Для каждого URL из колонок «Фото 1»–«Фото 5», если не null — INSERT product_photo
// 3. Лог в консоль: «Импортировано N товаров, ошибок: K»
```

### 8.2. Фото-прокси

Фотки лежат на `cbu01.alicdn.com`. Прокси через наш домен:

```typescript
// app/api/img-proxy/route.ts
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url || !url.startsWith('https://cbu01.alicdn.com/')) {
    return new Response('Bad URL', { status: 400 })
  }
  const upstream = await fetch(url, { cache: 'force-cache' })
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=604800, immutable'  // 7 дней
    }
  })
}
```

В UI: `<img src="/api/img-proxy?url=https://cbu01.alicdn.com/...jpg" />`.

### 8.3. Города (seed)

`scripts/seed-cities.ts`:

| Slug | Название | Винит. | Дни мин | Дни макс | По умолч. |
|---|---|---|---|---|---|
| moscow | Москва | Москву | 14 | 45 | ✅ |
| saint-petersburg | Санкт-Петербург | Санкт-Петербург | 16 | 48 | |
| ekaterinburg | Екатеринбург | Екатеринбург | 18 | 50 | |
| novosibirsk | Новосибирск | Новосибирск | 20 | 55 | |
| kazan | Казань | Казань | 16 | 48 | |
| nizhny-novgorod | Нижний Новгород | Нижний Новгород | 16 | 48 | |
| samara | Самара | Самару | 18 | 50 | |
| rostov-on-don | Ростов-на-Дону | Ростов-на-Дону | 18 | 50 | |
| **omsk** | Омск | Омск | 20 | 55 | |

---

## 9. Дизайн-система

База создана в HTML-прототипе. Переносим в production-проект.

### 9.1. Цвета

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        paper:       '#F7F5F0',
        'paper-2':   '#EFEDE6',
        surface:     '#FBFAF6',
        'surface-hi':'#FFFFFF',
        ink: {
          DEFAULT: '#0F0E0C',
          2:       '#2A2926',
          3:       '#6E6B65',
          4:       '#9F9C95',
        },
        hair:        '#E5E1D8',
        'hair-2':    '#D3CFC4',
        cinnabar:    '#EE4523',
        'cinnabar-2':'#D13911',
        'cinnabar-3':'#FF7458',
        sage:        '#5E6B47',
        ochre:       '#C08B3C',
        positive:    '#00875A',
        warning:     '#DE6B1F',
      },
      fontFamily: {
        display: ['var(--font-mona)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '8px', md: '12px', lg: '16px', xl: '20px',
      }
    }
  }
}
```

### 9.2. Шрифты (через next/font)

```typescript
// app/layout.tsx
import { Mona_Sans, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'

const monaSans = Mona_Sans({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mona',
  display: 'swap',
  axes: ['wdth']
})
const hanken = Hanken_Grotesk({ subsets: ['latin', 'cyrillic'], variable: '--font-hanken', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-jetbrains', display: 'swap' })
```

### 9.3. Компоненты

База shadcn/ui кастомизируется в духе прототипа:
- Все Button — pill (border-radius: 100px)
- Input, Textarea, Select — 10px radius
- Dialog, Sheet — 20px radius
- Card — 12–16px radius
- Soft shadows on hover: `shadow-[0_20px_40px_-18px_rgba(15,14,12,0.18)]`

### 9.4. Адаптивность

- Mobile-first для критических компонентов
- На мобиле фильтры каталога — Sheet drawer
- Минимум 44×44 px для tappable

### 9.5. Анимация

CSS-only где возможно. Уважать `prefers-reduced-motion`.

---

## 10. 152-ФЗ и юридические документы

### 10.1. Чек-лист соответствия

- [ ] Серверы (VPS + БД + S3) физически в РФ (Selectel Moscow ✓)
- [ ] Уведомление в РКН: https://pd.rkn.gov.ru/ (бесплатно, формы онлайн). Регистрационный номер размещаем в политике.
- [ ] Политика обработки ПД — заглушка в `/legal/privacy` (см. 10.2). Перед запуском заменить на согласованную с юристом.
- [ ] Согласие на обработку ПД — чекбокс при регистрации, логируется в таблицу `consents`.
- [ ] Cookie-баннер с явным согласием на analytics-cookies.
- [ ] Опция «Удалить аккаунт» в личном кабинете — soft-delete (ПД анонимизируются, заказы остаются для бухгалтерии).
- [ ] Срок хранения ПД: 3 года после прекращения договорных отношений.

### 10.2. Заглушки документов

**`/legal/privacy` (Политика обработки ПД):**

```markdown
# Политика обработки персональных данных

ИП Оболенский Владимир (далее — «Оператор») в соответствии с
Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»
осуществляет обработку персональных данных пользователей сервиса
Yí (далее — «Сайт»).

## 1. Какие данные мы обрабатываем

- ФИО (или наименование юридического лица)
- Номер телефона
- Email (при наличии)
- ИНН, КПП, ОГРН (для юридических лиц)
- IP-адрес и файлы cookies для аналитики

## 2. Цели обработки

- Регистрация на Сайте
- Оформление и обработка заказов
- Связь менеджера с клиентом
- Выставление документов (счёт, договор, акт)
- Аналитика качества сервиса (обезличенные данные)

## 3. Передача третьим лицам

Персональные данные не передаются третьим лицам, за исключением
случаев, требуемых законодательством РФ, и партнёров по логистике
(с обезличиванием там, где это возможно).

## 4. Срок хранения

Персональные данные хранятся до отзыва согласия пользователя
или прекращения договорных отношений, плюс 3 года для целей
бухгалтерского и налогового учёта.

## 5. Ваши права

В соответствии со статьями 14–18 ФЗ № 152-ФЗ, вы вправе:
- Запросить информацию о ваших данных
- Потребовать их исправления, блокирования или удаления
- Отозвать согласие на обработку

Для реализации прав напишите на: privacy@yi-opt.ru
(или замените на актуальный email при запуске).

## 6. Контакты Оператора

ИП Оболенский Владимир
ИНН: [указать перед запуском]
ОГРНИП: [указать перед запуском]
Email: privacy@yi-opt.ru

Уведомление о намерении обрабатывать ПД подано в РКН.
Регистрационный номер в реестре операторов ПД: [указать после регистрации].

**Версия документа:** 1.0
**Дата вступления в силу:** [указать перед запуском]

⚠️ Это типовой шаблон. Перед запуском в коммерческую эксплуатацию
необходимо согласование с юристом, специализирующимся на 152-ФЗ.
```

**`/legal/offer` (Публичная оферта)** и **`/legal/terms` (Условия работы)** — аналогичные заглушки с пометкой «требуется юридическое согласование».

### 10.3. Удаление аккаунта

Кнопка «Удалить аккаунт» в `/account` → подтверждение → soft-delete:
- `users.is_active = false`
- `users.name = 'удалённый пользователь'`
- `users.phone = null` (или маска `+7-***-***-XXXX`)
- `users.email = null`
- В `consents` пишется запись `consent_type = 'withdrawn'`
- Заказы сохраняются с snapshot-данными, привязка теряет персонификацию

---

## 11. Безопасность

- HTTPS обязателен (HSTS включить)
- Cookies с `httpOnly`, `secure`, `sameSite=lax`
- CSRF-protection (Auth.js делает это)
- Rate limiting на login/register/change-password — 5 попыток/мин с IP
- Валидация всех входов через Zod
- Параметризованные запросы (Drizzle делает автоматически)
- Загрузка файлов: проверка MIME, лимит 10 MB, только image/jpeg, png, webp
- Bcrypt cost 12 для паролей
- Логи без PII: маскируем телефон/email
- Защита `/api/admin/*` (когда появится): middleware с проверкой ролей

---

## 12. SEO

- SSR для каталога и карточек
- Уникальные `<title>` и `<meta description>` на каждой странице
- `og:image` на карточке товара — главная фотка
- Структурированные данные (JSON-LD `Product`, `Offer`) на карточке
- Sitemap.xml — генерируется автоматически
- Robots.txt: открыт, кроме `/account`, `/checkout`
- В URL — slug (например `/catalog/tv-stands`, `/product/yi-12345`)
- Yandex Webmaster + Yandex Metrica

---

## 13. Roadmap

### MVP (4–6 недель)

- [x] Анализ требований, прототип (выполнено)
- [ ] Инфра: домен, VPS Selectel в Москве, PostgreSQL на VPS, S3, SSL
- [ ] Каркас Next.js + Tailwind + Drizzle + Auth.js
- [ ] Миграции БД (раздел 4)
- [ ] Импортёр Excel → БД (раздел 8.1)
- [ ] Seed городов (раздел 8.3)
- [ ] Главная, каталог, карточка товара
- [ ] Корзина, регистрация, оформление заказа
- [ ] Личный кабинет
- [ ] Форма персонального подбора с загрузкой фото в S3
- [ ] **Telegram-уведомления** (раздел 7)
- [ ] Заглушки документов (раздел 10.2)
- [ ] Уведомление в РКН подано
- [ ] Деплой
- [ ] Yandex Metrica + Webmaster

### Out of scope для MVP

- ❌ Веб-админка (менеджер работает в Telegram)
- ❌ Автоматическое изменение статусов заказа (меняются ручным SQL `UPDATE`)
- ❌ Онлайн-оплата (через банк после согласования)
- ❌ Email-уведомления
- ❌ Wishlist / избранное
- ❌ Отзывы и рейтинги
- ❌ Чат на сайте (только Telegram)
- ❌ Многоязычность
- ❌ Мобильное приложение
- ❌ Авто-обновление курса CNY (захардкожен)
- ❌ Несколько ценовых тиров (используем только Цена 1)
- ❌ Городская дифференциация цен (цена единая, меняется только срок)

### Будущие версии

- v1.1: веб-админка для менеджера, расширенные фильтры, ценовые тиры
- v1.2: интеграция с 1С для бухгалтерии, программа лояльности
- v2.0: онлайн-оплата, мобильное приложение

---

## 14. Приложение А: переменные окружения

```bash
# .env.local (для разработки) и .env.production (для прода)

# База данных
DATABASE_URL=postgresql://yi:password@localhost:5432/yi_marketplace

# Auth
NEXTAUTH_SECRET=<сгенерировать через openssl rand -base64 32>
NEXTAUTH_URL=https://yi-opt.ru

# S3 (Selectel Object Storage)
S3_ENDPOINT=https://s3.ru-1.storage.selcloud.ru
S3_BUCKET=yi-marketplace
S3_REGION=ru-1
S3_ACCESS_KEY=<from Selectel console>
S3_SECRET_KEY=<from Selectel console>

# Telegram (заглушка, заменить на реальные при запуске)
TELEGRAM_BOT_TOKEN=8533120323:AAFqwG2u86PkzoHahINNU0f6gEQT-eXyE0c
TELEGRAM_MANAGER_CHAT_ID=8533120323

# Yandex Metrica
NEXT_PUBLIC_YANDEX_METRICA_ID=<from Metrica>

NODE_ENV=production
```

---

## Финал

Документ — финальный технический бриф. По нему за 4–6 недель fullstack-разработчик (или AI-агент с разработчиком в роли тех. лида) собирает MVP. Дальше — пробное использование, обратная связь, v1.1 с веб-админкой.

**Удачи. Делаем лучший B2B-маркетплейс мебели на российском рынке.**

— Yí, 2026
