/**
 * POST /api/sourcing-requests — создаёт заявку на подбор + Telegram-уведомление.
 * GET  /api/sourcing-requests — список заявок текущего пользователя.
 *
 * Фото уже загружены в S3 через POST /api/uploads/sourcing-photo,
 * сюда передаются их URL.
 */

import { NextResponse } from 'next/server'
import { eq, desc, inArray, asc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { sourcingRequests, sourcingRequestPhotos, users } from '@/db/schema'
import { createSourcingSchema } from '@/lib/validation'
import { generateSourcingNumber } from '@/lib/utils'
import { notifyNewSourcing } from '@/lib/telegram'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Войдите, чтобы отправить заявку' } },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_JSON', message: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  const parsed = createSourcingSchema.safeParse(body)
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
  const number = generateSourcingNumber()

  const request = await db.transaction(async (tx) => {
    const [r] = await tx
      .insert(sourcingRequests)
      .values({
        number,
        userId: session.user.id,
        description: input.description,
        qty: input.qty,
        budgetRub: input.budget_rub !== null && input.budget_rub !== undefined ? String(input.budget_rub) : null,
        status: 'new',
      })
      .returning()

    if (input.photo_urls.length > 0) {
      await tx.insert(sourcingRequestPhotos).values(
        input.photo_urls.map((url, idx) => ({
          requestId: r.id,
          url,
          sortOrder: idx,
        }))
      )
    }

    return r
  })

  // Telegram — fire-and-forget
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1)
  if (user) {
    notifyNewSourcing({
      number,
      userName: user.name,
      userPhone: user.phone,
      description: input.description,
      qty: input.qty,
      budgetRub: input.budget_rub,
      photoUrls: input.photo_urls,
    }).catch((e) => {
      console.error('[Sourcing] Telegram notification failed:', e)
    })
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

  const ids = list.map((r) => r.id)
  const photos =
    ids.length > 0
      ? await db
          .select()
          .from(sourcingRequestPhotos)
          .where(inArray(sourcingRequestPhotos.requestId, ids))
          .orderBy(asc(sourcingRequestPhotos.sortOrder))
      : []

  const photosByRequest = new Map<string, string[]>()
  for (const p of photos) {
    const arr = photosByRequest.get(p.requestId) ?? []
    arr.push(p.url)
    photosByRequest.set(p.requestId, arr)
  }

  return NextResponse.json(
    list.map((r) => ({
      number: r.number,
      status: r.status,
      description: r.description,
      qty: r.qty,
      budget_rub: r.budgetRub !== null ? Number(r.budgetRub) : null,
      photos: photosByRequest.get(r.id) ?? [],
      created_at: r.createdAt,
    }))
  )
}
