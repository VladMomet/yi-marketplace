/**
 * УСТАРЕВШИЙ ЭНДПОИНТ.
 *
 * Раньше принимал фото-референсы и грузил в S3 (Selectel Object Storage).
 * Сейчас фото идут напрямую в Telegram через /api/sourcing-requests
 * (multipart), S3 в MVP не используется.
 *
 * Оставлен как заглушка с 410 Gone, чтобы старые клиенты получили понятную
 * ошибку, а не 404.
 */

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: 'GONE',
        message:
          'Этот эндпоинт больше не используется. Фото отправляются вместе с заявкой через /api/sourcing-requests.',
      },
    },
    { status: 410 }
  )
}
