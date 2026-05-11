/**
 * GET /api/img-proxy?url=https://cbu01.alicdn.com/...
 *
 * Прокси для фото товаров с CDN 1688.
 *
 * Зачем: 1) скрываем источник (в DevTools видно только наш домен)
 *        2) даём возможность позже перейти на S3 без правки фронта
 *        3) кэшируем агрессивно
 *
 * Безопасность: разрешён ТОЛЬКО whitelist хостов.
 */

import { NextResponse } from 'next/server'

const ALLOWED_HOSTS = new Set([
  'cbu01.alicdn.com',
  'cbu02.alicdn.com',
  'cbu03.alicdn.com',
  'cbu04.alicdn.com',
])

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) {
    return new Response('Missing url param', { status: 400 })
  }

  let target: URL
  try {
    target = new URL(url)
  } catch {
    return new Response('Bad URL', { status: 400 })
  }

  if (target.protocol !== 'https:') return new Response('HTTPS only', { status: 400 })
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return new Response('Host not allowed', { status: 400 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      // На стороне сервера кэшируем
      cache: 'force-cache',
      headers: {
        // 1688 может проверять реферер
        Referer: 'https://www.1688.com/',
      },
    })

    if (!upstream.ok) {
      return new Response('Upstream error', { status: upstream.status })
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, immutable', // 7 дней
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    console.error('[ImgProxy] Fetch failed:', e)
    return new Response('Fetch failed', { status: 502 })
  }
}
