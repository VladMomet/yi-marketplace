/**
 * POST /api/sourcing-requests — создаёт заявку на подбор + Telegram-уведомление.
 * GET  /api/sourcing-requests — список заявок текущего пользователя.
 *
 * РАНЬШЕ фото загружались в S3 через /api/uploads/sourcing-photo и сюда
 * приходили URL'ы (JSON). СЕЙЧАС — фото идут multipart прямо в этот эндпоинт
 * и сразу пересылаются в Telegram. S3 в MVP не используем.
 *
 * Поля multipart:
 *   description: string
 *   qty: number (как строка)
 *   budget_rub: number | пусто
 *   photo_0, photo_1, photo_2: File (опционально, до 3 шт)
 */

import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { sourcingRequests, users } from '@/db/schema'
import { createSourcingSchema } from '@/lib/validation'
import { generateSourcingNumber } from '@/lib/utils'
import { notifyNewSourcing } from '@/lib/telegram'
import {
  SOURCING_PHOTO_MAX_SIZE_BYTES,
  SOURCING_PHOTOS_MAX_COUNT,
} from '@/lib/constants'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Войдите, чтобы отправить заявку' } },
      { status: 401 }
    )
  }

  // Принимаем multipart/form-data
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_FORM', message: 'Невалидная форма' } },
      { status: 400 }
    )
  }

  // Текстовые поля
  const description = String(form.get('description') ?? '').trim()
  const qtyRaw = String(form.get('qty') ?? '').trim()
  const budgetRaw = String(form.get('budget_rub') ?? '').trim()

  const qty = Number(qtyRaw)
  const budgetRub = budgetRaw === '' ? null : Number(budgetRaw)

  const parsed = createSourcingSchema.safeParse({
    description,
    qty,
    budget_rub: budgetRub,
  })
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Проверьте поля',
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    )
  }

  const input = parsed.data

  // Собираем фото-файлы
  const photoFiles: File[] = []
  for (let i = 0; i < SOURCING_PHOTOS_MAX_COUNT; i++) {
    const f = form.get(`photo_${i}`)
    if (f instanceof File && f.size > 0) {
      // Валидация типа и размера
      if (!ALLOWED_TYPES.has(f.type)) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_PHOTO_TYPE',
              message: `Фото ${i + 1}: допустимы только JPG, PNG, WebP`,
            },
          },
          { status: 415 }
        )
      }
      if (f.size > SOURCING_PHOTO_MAX_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: {
              code: 'PHOTO_TOO_LARGE',
              message: `Фото ${i + 1} больше ${Math.round(
                SOURCING_PHOTO_MAX_SIZE_BYTES / 1024 / 1024
              )} МБ`,
            },
          },
          { status: 413 }
        )
      }
      photoFiles.push(f)
    }
  }

  // Создаём заявку (без записи URL'ов фото — мы их не храним больше)
  const number = generateSourcingNumber()
  const [request] = await db
    .insert(sourcingRequests)
    .values({
      number,
      userId: session.user.id,
      description: input.description,
      qty: input.qty,
      budgetRub:
        input.budget_rub !== null && input.budget_rub !== undefined
          ? String(input.budget_rub)
          : null,
      status: 'new',
    })
    .returning()

  console.log('[Sourcing] Created request', number, 'with', photoFiles.length, 'photos')

  // Telegram-уведомление: текст + фото (await, чтобы успело уйти до завершения serverless)
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (user) {
      // Конвертим File → Buffer
      const photos = await Promise.all(
        photoFiles.map(async (f, idx) => ({
          buffer: Buffer.from(await f.arrayBuffer()),
          filename: f.name || `photo-${idx}.jpg`,
          contentType: f.type,
        }))
      )

      console.log('[Sourcing] Sending Telegram notification for', number)
      await notifyNewSourcing({
        number,
        userName: user.name,
        userPhone: user.phone,
        description: input.description,
        qty: input.qty,
        budgetRub: input.budget_rub,
        photos,
      })
      console.log('[Sourcing] Telegram notification sent for', number)
    }
  } catch (e) {
    console.error('[Sourcing] Telegram notification failed:', e)
    // не валим заявку — она уже в БД
  }

  return NextResponse.json({
    request: {
      number: request.number,
      status: request.status,
      created_at: request.createdAt,
    },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const list = await db
    .select()
    .from(sourcingRequests)
    .where(eq(sourcingRequests.userId, session.user.id))
    .orderBy(desc(sourcingRequests.createdAt))

  return NextResponse.json(
    list.map((r) => ({
      number: r.number,
      status: r.status,
      description: r.description,
      qty: r.qty,
      budget_rub: r.budgetRub !== null ? Number(r.budgetRub) : null,
      photos: [], // больше не храним — менеджер получает фото в TG
      created_at: r.createdAt,
    }))
  )
}
