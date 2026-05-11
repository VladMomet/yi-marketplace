/**
 * PhotoUploader — загрузка до 3 фото-референсов.
 *
 * Каждое фото сразу загружается на /api/uploads/sourcing-photo (S3),
 * возвращённый URL добавляется в state. При удалении — URL удаляется,
 * родителю передаётся актуальный список.
 *
 * Поддержка: drag-n-drop, клик по зоне, превью с кнопкой ×, loading-state,
 * ошибки (размер, формат).
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  SOURCING_PHOTO_MAX_SIZE_BYTES,
  SOURCING_PHOTOS_MAX_COUNT,
} from '@/lib/constants'

interface PhotoSlot {
  id: string // local uuid для key и удаления
  url: string | null // постоянный URL после успешной загрузки
  uploading: boolean
  error: string | null
  preview: string | null // object URL для немедленного превью
}

interface Props {
  value: string[] // массив URL'ов уже загруженных фото
  onChange: (urls: string[]) => void
  disabled?: boolean
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export function PhotoUploader({ value, onChange, disabled }: Props) {
  // Внутренний state хранит локальные слоты с превью.
  // value (URLs) — это просто проекция: для слотов где url !== null.
  // Контроллируем через value? Нет, для UX лучше внутренний state.
  const [slots, setSlots] = useState<PhotoSlot[]>(() =>
    value.map((url) => ({ id: genId(), url, uploading: false, error: null, preview: null }))
  )
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateParent = useCallback(
    (next: PhotoSlot[]) => {
      const urls = next.map((s) => s.url).filter((u): u is string => u !== null)
      onChange(urls)
    },
    [onChange]
  )

  const uploadFile = async (file: File, slotId: string) => {
    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/uploads/sourcing-photo', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        const msg = data?.error?.message ?? 'Не удалось загрузить'
        setSlots((prev) => {
          const next = prev.map((s) =>
            s.id === slotId ? { ...s, uploading: false, error: msg, url: null } : s
          )
          updateParent(next)
          return next
        })
        return
      }
      const data = (await res.json()) as { url: string }
      setSlots((prev) => {
        const next = prev.map((s) =>
          s.id === slotId
            ? { ...s, uploading: false, url: data.url, error: null }
            : s
        )
        updateParent(next)
        return next
      })
    } catch {
      setSlots((prev) => {
        const next = prev.map((s) =>
          s.id === slotId
            ? { ...s, uploading: false, error: 'Сеть недоступна', url: null }
            : s
        )
        updateParent(next)
        return next
      })
    }
  }

  const addFiles = (files: FileList | File[]) => {
    if (disabled) return
    const arr = Array.from(files)
    const remaining = SOURCING_PHOTOS_MAX_COUNT - slots.filter((s) => !s.error).length

    for (let i = 0; i < arr.length && i < remaining; i++) {
      const file = arr[i]
      // Валидация
      let error: string | null = null
      if (!ALLOWED_TYPES.has(file.type)) {
        error = 'Только JPG, PNG, WebP'
      } else if (file.size > SOURCING_PHOTO_MAX_SIZE_BYTES) {
        error = 'Файл больше 10 MB'
      }

      const id = genId()
      const preview = URL.createObjectURL(file)
      const slot: PhotoSlot = {
        id,
        url: null,
        uploading: error === null,
        error,
        preview,
      }

      setSlots((prev) => [...prev, slot])

      if (!error) {
        uploadFile(file, id)
      }
    }
  }

  const removeSlot = (id: string) => {
    setSlots((prev) => {
      const next = prev.filter((s) => s.id !== id)
      // Освободим object URL чтобы не текла память
      const removed = prev.find((s) => s.id === id)
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      updateParent(next)
      return next
    })
  }

  const activeCount = slots.filter((s) => !s.error).length
  const canAdd = activeCount < SOURCING_PHOTOS_MAX_COUNT && !disabled

  return (
    <div>
      {/* Превью загруженных */}
      {slots.length > 0 && (
        <ul className="mb-4 grid grid-cols-3 gap-3 sm:gap-4">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-lg border-2',
                slot.error
                  ? 'border-cinnabar/40'
                  : slot.url
                  ? 'border-hair'
                  : 'border-hair-2'
              )}
            >
              {(slot.url || slot.preview) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={slot.url ?? slot.preview ?? ''}
                  alt=""
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover',
                    slot.uploading && 'opacity-50'
                  )}
                />
              )}

              {slot.uploading && (
                <div className="absolute inset-0 grid place-items-center bg-paper/50 backdrop-blur-sm">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="animate-spin text-ink-2"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="8 40"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}

              {slot.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-cinnabar/10 px-2 text-center text-[10px] uppercase tracking-wider text-cinnabar">
                  {slot.error}
                </div>
              )}

              <button
                type="button"
                onClick={() => removeSlot(slot.id)}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/85 text-paper opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label="Удалить фото"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 2l6 6M8 2L2 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Drop-zone */}
      {canAdd && (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragOver
              ? 'border-cinnabar bg-cinnabar/5'
              : 'border-hair-2 bg-paper hover:border-ink-2 hover:bg-paper-2'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="sr-only"
          />
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-ink-3">
            <rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M4 18l5-5 5 5 4-4 6 6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <div className="text-sm font-medium text-ink-2">
            Перетащите фото или нажмите для выбора
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
            До {SOURCING_PHOTOS_MAX_COUNT - activeCount} файлов · JPG / PNG / WebP · до 10 MB
          </div>
        </label>
      )}

      {!canAdd && activeCount >= SOURCING_PHOTOS_MAX_COUNT && (
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
          Достигнут лимит: {SOURCING_PHOTOS_MAX_COUNT} фото
        </p>
      )}
    </div>
  )
}
