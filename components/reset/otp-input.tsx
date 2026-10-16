'use client'

import { useRef } from 'react'

type Props = {
  /** 8 karakter (tanpa strip). */
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  invalid?: boolean
}

const GROUP_SIZES = [4, 4]

/** Input kode reset 8 kotak: dukung ketik, hapus, panah kiri/kanan, dan tempel. */
export function OtpInput({ value, onChange, disabled, invalid }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chars = Array.from({ length: 8 }, (_, i) => value[i] ?? '')

  const focusAt = (index: number) => refs.current[Math.max(0, Math.min(7, index))]?.focus()

  function setAt(index: number, text: string) {
    const clean = text.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
    if (!clean) return
    const next = chars.slice()
    for (let i = 0; i < clean.length && index + i < 8; i++) next[index + i] = clean[i]
    onChange(next.join(''))
    focusAt(Math.min(7, index + clean.length))
  }

  function onInput(i: number, raw: string) {
    setAt(i, raw)
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = chars.slice()
      if (next[i]) {
        next[i] = ''
        onChange(next.join(''))
      } else if (i > 0) {
        next[i - 1] = ''
        onChange(next.join(''))
        focusAt(i - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusAt(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusAt(i + 1)
    }
  }

  function onPaste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    setAt(i, e.clipboardData.getData('text'))
  }

  let index = -1

  return (
    <div className="flex items-center justify-center gap-2 w-full" role="group" aria-label="Kode reset 8 karakter">
      {GROUP_SIZES.map((size, group) => (
        <div key={group} className="flex items-center gap-1.5">
          {Array.from({ length: size }, () => {
            index += 1
            const i = index
            return (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el
                }}
                value={chars[i]}
                onChange={(e) => onInput(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={(e) => onPaste(i, e)}
                onFocus={(e) => e.target.select()}
                disabled={disabled}
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={1}
                aria-label={`Karakter ${i + 1} dari 8`}
                aria-invalid={invalid || undefined}
                className={`w-11 h-14 text-center font-headline-sm text-navy-900 bg-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-surface-container-lowest transition-all uppercase disabled:opacity-60 ${
                  invalid ? 'ring-2 ring-danger' : ''
                }`}
              />
            )
          })}
          {group === 0 && (
            <span aria-hidden="true" className="text-slate-400 font-headline-md select-none">
              -
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
