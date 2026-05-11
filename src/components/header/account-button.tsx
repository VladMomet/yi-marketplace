/**
 * AccountButton — отображает «Войти» или имя пользователя в зависимости от сессии.
 *
 * Сессия читается через next-auth/react на клиенте.
 */

'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export function AccountButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="hidden h-10 w-24 animate-pulse rounded-full bg-paper-2 md:block" />
    )
  }

  if (session?.user) {
    return (
      <Link
        href="/account"
        className="hidden items-center gap-2 rounded-full border border-hair bg-surface-hi px-4 py-2 text-xs font-semibold text-ink hover:border-ink-2 transition-colors md:inline-flex"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 12c1-2.5 3-4 5-4s4 1.5 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="max-w-[120px] truncate">{session.user.name ?? 'Кабинет'}</span>
      </Link>
    )
  }

  return (
    <Link
      href="/login"
      className="hidden items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-paper hover:bg-cinnabar transition-colors md:inline-flex"
    >
      Войти
    </Link>
  )
}
