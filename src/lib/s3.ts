/**
 * S3-клиент для Selectel Object Storage.
 *
 * Используется только для фото-референсов из заявок на подбор.
 * Фото товаров с 1688 не дублируем — они отдаются прокси-эндпоинтом
 * /api/img-proxy?url=... напрямую с CDN Alibaba.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const endpoint = process.env.S3_ENDPOINT
const region = process.env.S3_REGION ?? 'ru-1'
const bucket = process.env.S3_BUCKET
const accessKey = process.env.S3_ACCESS_KEY
const secretKey = process.env.S3_SECRET_KEY
const publicUrl = process.env.S3_PUBLIC_URL ?? endpoint

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client
  if (!endpoint || !accessKey || !secretKey || !bucket) {
    throw new Error(
      'S3 not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET in env.'
    )
  }
  _client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true, // Selectel требует path-style
  })
  return _client
}

/**
 * Загружает файл в S3 и возвращает публичный URL.
 *
 * @param key — путь в бакете, например 'sourcing/2026/05/abc-123.jpg'
 * @param body — содержимое файла (Buffer или Uint8Array)
 * @param contentType — MIME-тип
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const client = getClient()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'public, max-age=2592000', // 30 дней
    })
  )
  return `${publicUrl}/${key}`
}

/** Удаляет объект из S3 */
export async function deleteFromS3(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }))
}

/**
 * Генерирует уникальный ключ для фото-референса.
 * Пример: sourcing/2026-05-11/uuid.jpg
 */
export function makeSourcingPhotoKey(extension: string): string {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const ext = extension.startsWith('.') ? extension.slice(1) : extension
  return `sourcing/${yyyy}-${mm}-${dd}/${randomUUID()}.${ext}`
}

/**
 * Извлекает S3-ключ из публичного URL.
 * https://s3.ru-1.storage.selcloud.ru/yi-marketplace/sourcing/.../abc.jpg → sourcing/.../abc.jpg
 */
export function keyFromUrl(url: string): string | null {
  if (!publicUrl) return null
  if (!url.startsWith(publicUrl)) return null
  return url.slice(publicUrl.length).replace(/^\//, '')
}
