/**
 * POST /api/uploads/sourcing-photo
 *
 * Загружает одно фото-референс для заявки на подбор в S3.
 * Принимает multipart/form-data с полем `file`.
 * Возвращает публичный URL.
 *
 * Auth: optional — позволяем загружать до регистрации
 * (фронт ведёт на регистрацию после сбора фото).
 *
 * Лимит: 10 MB, типы image/jpeg|png|webp.
 */

import { NextResponse } from 'next/server'
import { uploadToS3, makeSourcingPhotoKey } from '@/lib/s3'
import { SOURCING_PHOTO_MAX_SIZE_BYTES } from '@/lib/constants'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_FORM', message: 'Invalid multipart form' } },
      { status: 400 }
    )
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'NO_FILE', message: 'Файл не передан' } },
      { status: 400 }
    )
  }

  if (file.size > SOURCING_PHOTO_MAX_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: 'FILE_TOO_LARGE',
          message: `Файл слишком большой. Максимум ${Math.round(
            SOURCING_PHOTO_MAX_SIZE_BYTES / 1024 / 1024
          )} MB.`,
        },
      },
      { status: 413 }
    )
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_TYPE',
          message: 'Допустимы только JPG, PNG, WebP',
        },
      },
      { status: 415 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = EXT_BY_MIME[file.type] ?? 'bin'
  const key = makeSourcingPhotoKey(ext)

  try {
    const url = await uploadToS3(key, buffer, file.type)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[Upload] S3 error:', e)
    return NextResponse.json(
      { error: { code: 'STORAGE_ERROR', message: 'Не удалось сохранить файл' } },
      { status: 500 }
    )
  }
}
