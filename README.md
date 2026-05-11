# Yí — B2B-маркетплейс мебели

Next.js 15 + TypeScript + PostgreSQL + Drizzle ORM + Tailwind + Auth.js.
Маркетплейс мебели «Yí» (Китай → Россия). Реализация по [техническому брифу](./yi-brief.md).

## Что уже сделано в этой итерации

### Backend (готов и протестирован структурой):

- ✅ Полная Drizzle-схема БД (`src/db/schema.ts`)
- ✅ Скрипт сидинга городов (9 шт, включая Омск)
- ✅ Скрипт сидинга 21 категории
- ✅ Импортёр Excel → БД (с upsert по `offer_id` и архивированием ушедших товаров)
- ✅ Auth.js v5 с Credentials provider
- ✅ API ручки:
  - `POST /api/auth/register` — регистрация физлица/юрлица + логирование согласий
  - `GET  /api/auth/me` — текущий пользователь
  - `GET  /api/categories`
  - `GET  /api/cities`
  - `GET  /api/products` — каталог с фильтрами, поиском, фасетами
  - `GET  /api/products/[sku]` — детальная карточка с разбивкой цены
  - `POST /api/orders` — создание заказа + Telegram-уведомление
  - `GET  /api/orders` — список заказов пользователя
  - `GET  /api/orders/[number]` — детали заказа
  - `POST /api/sourcing-requests` — заявка на подбор + Telegram-уведомление
  - `GET  /api/sourcing-requests` — список заявок
  - `POST /api/uploads/sourcing-photo` — загрузка фото-референса в S3
  - `GET  /api/img-proxy` — прокси картинок с 1688
  - `GET/PATCH /api/users/me/profile`
  - `POST /api/users/me/change-password`
- ✅ Telegram-уведомления (формат точно по брифу 7.2 и 7.3)
- ✅ S3-загрузка фото (Selectel Object Storage совместимый)
- ✅ Расчёт цены с разбивкой (фабрика/логистика/ВЭД/НДС)
- ✅ Zod-валидация всех входов

### Frontend (минимальная заглушка):

- ✅ Layout с шрифтами (Mona Sans + Hanken Grotesk + JetBrains Mono)
- ✅ Tailwind с дизайн-системой (палитра, радиусы, тени)
- ✅ Главная страница — health-page подтверждающий что приложение работает
- ⏳ Полноценный UI каталога/карточки/корзины/регистрации — **следующий этап** (используем прототип `yi-opt-prototype.html` как референс)

---

## Локальный запуск

### Требования

- Node.js ≥ 20
- PostgreSQL ≥ 14 (локально или Docker)
- Excel-файл `мебель_1688.xlsx`

### Шаг 1. Установка зависимостей

```bash
npm install
```

### Шаг 2. PostgreSQL

Локально через Docker (рекомендуется):

```bash
docker run --name yi-postgres \
  -e POSTGRES_USER=yi \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=yi_marketplace \
  -p 5432:5432 \
  -d postgres:16

# проверить, что запустилось
docker ps
```

Или установить PostgreSQL нативно и создать БД `yi_marketplace` с пользователем `yi`.

### Шаг 3. Конфигурация

```bash
cp .env.example .env.local
```

Откройте `.env.local` и:

1. **`DATABASE_URL`** — оставьте как есть, если PostgreSQL по дефолтным настройкам.
2. **`AUTH_SECRET`** — сгенерируйте: `openssl rand -base64 32` и вставьте.
3. **`TELEGRAM_BOT_TOKEN` и `TELEGRAM_MANAGER_CHAT_ID`** — уже заполнены заглушками из брифа.
4. **S3** — пока можно оставить заглушки (используется только при загрузке фото в подборе).

### Шаг 4. Положите Excel-файл

```bash
mkdir -p data
cp /path/to/мебель_1688.xlsx ./data/
```

### Шаг 5. Создать таблицы и засеять данные

Одной командой:

```bash
npm run setup
```

Это запустит последовательно:
1. `npm run db:push` — создать таблицы по Drizzle-схеме
2. `npm run seed:cities` — засеять 9 городов
3. `npm run seed:categories` — засеять 21 категорию
4. `npm run import:products` — импортировать 1951 товар

Если что-то пошло не так — можно запустить шаги по отдельности.

### Шаг 6. Запустить dev-сервер

```bash
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000).

---

## Проверка работоспособности

### Через браузер:

- `http://localhost:3000` — главная с метриками каталога
- `http://localhost:3000/api/categories` — JSON 21 категории
- `http://localhost:3000/api/cities` — JSON 9 городов
- `http://localhost:3000/api/products?per_page=5` — первые 5 товаров

### Через curl:

```bash
# Регистрация физлица
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "physical",
    "phone": "+79991234567",
    "name": "Тест Тестов",
    "password": "secret123",
    "consents": { "privacy": true, "offer": true }
  }'

# Получить категории
curl http://localhost:3000/api/categories | jq

# Получить товары первой категории
curl 'http://localhost:3000/api/products?category=tv-stands&per_page=3' | jq
```

### Drizzle Studio (визуальный просмотр БД):

```bash
npm run db:studio
```

Откроется на `https://local.drizzle.studio`.

---

## Структура проекта

```
yi-marketplace/
├── README.md                  ← вы здесь
├── yi-brief.md                ← тех. бриф (положить отдельно из outputs)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── drizzle.config.ts
├── .env.example
├── .gitignore
│
├── data/
│   └── мебель_1688.xlsx       ← положить вручную
│
├── drizzle/                   ← миграции (генерируются из схемы)
│
├── scripts/
│   ├── seed-cities.ts
│   ├── seed-categories.ts
│   └── import-products.ts
│
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── api/
    │   │   ├── auth/
    │   │   ├── categories/
    │   │   ├── cities/
    │   │   ├── products/
    │   │   ├── orders/
    │   │   ├── sourcing-requests/
    │   │   ├── uploads/
    │   │   ├── img-proxy/
    │   │   └── users/me/
    │   └── (страницы добавятся в следующей итерации)
    │
    ├── db/
    │   ├── schema.ts          ← полная Drizzle-схема
    │   └── index.ts           ← Drizzle-клиент
    │
    └── lib/
        ├── auth.ts            ← Auth.js v5 config
        ├── constants.ts       ← курс CNY, разбивка цены, ИП Оболенский
        ├── pricing.ts         ← расчёт цены и разбивки
        ├── s3.ts              ← Selectel S3 helper
        ├── telegram.ts        ← уведомления менеджеру
        ├── utils.ts           ← formatRub, pluralize, generateNumber и т.п.
        └── validation.ts      ← Zod-схемы
```

---

## Что дальше

### Следующая итерация (Frontend)

На основе HTML-прототипа `yi-opt-prototype.html` собрать React-компоненты:

1. Header с тикером и селектором города
2. Hero на главной с коллажем фото
3. Каталог со списком/фильтрами/пагинацией
4. Карточка товара с галереей и разбивкой цены
5. Корзина (drawer)
6. Регистрация и оформление заказа
7. Личный кабинет с тремя вкладками
8. Форма персонального подбора
9. Cookie-баннер
10. Юр.документы (заглушки)

### Деплой на Selectel

1. Создать VPS в Selectel Cloud, Москва (минимум 2 vCPU / 4 GB)
2. Установить Node.js 20, PostgreSQL 16, Nginx
3. Склонировать репозиторий, `npm install`, `npm run build`
4. PM2 для управления процессом: `pm2 start npm --name yi -- start`
5. Nginx-конфиг с reverse proxy на :3000
6. Let's Encrypt через `certbot --nginx`
7. Создать Object Storage bucket
8. Заполнить `.env.production` реальными секретами

### Юридические шаги

1. Подать уведомление в РКН: https://pd.rkn.gov.ru/
2. Согласовать с юристом политику, оферту, условия работы
3. Зарегистрировать ИНН/ОГРН ИП Оболенский Владимир и вставить в `LEGAL_ENTITY` в `src/lib/constants.ts`
4. Купить домен `.ru`

---

## Контакты

Технический бриф: см. `yi-brief.md`.

При вопросах по реализации — обращаться к разработчику с этим README и брифом.
