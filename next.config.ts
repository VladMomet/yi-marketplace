import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Изображения с 1688 проксируются через /api/img-proxy. Если где-то нужно
  // отдать оригинальный URL напрямую — разрешаем эти домены.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cbu01.alicdn.com' },
      { protocol: 'https', hostname: 's3.ru-1.storage.selcloud.ru' },
    ],
  },

  reactStrictMode: true,

  // Логирование запросов в dev-режиме для отладки
  logging: {
    fetches: { fullUrl: true },
  },

  // Pg-driver и bcryptjs — нативные модули, должны быть external
  // (раньше было `experimental.serverComponentsExternalPackages`, deprecated)
  serverExternalPackages: ['postgres', 'bcryptjs'],
}

export default nextConfig
