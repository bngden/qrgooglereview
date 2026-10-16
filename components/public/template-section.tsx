'use client'

import { useState } from 'react'
import { TEMPLATES, DEFAULT_TEMPLATE_ID, findTemplate } from './templates'

/** Section "Template permintaan review" pada beranda (desain Stitch). */
export function TemplateSection() {
  const [tab, setTab] = useState(DEFAULT_TEMPLATE_ID)
  const [copied, setCopied] = useState(false)

  const active = findTemplate(tab)
  const text = active.text('NAMA_BISNIS', '[LINK REVIEW]')

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="template-pesan" className="w-full bg-blue-50 py-[96px] scroll-mt-[72px]">
      <div className="max-w-7xl mx-auto px-gutter flex flex-col items-center gap-space-2xl">
        <div className="text-center max-w-xl flex flex-col gap-space-sm">
          <h2 className="font-headline-lg text-[28px] md:text-[36px] text-navy-900">
            Template permintaan review
          </h2>
          <p className="font-body-lg text-slate-600">
            Gunakan kalimat persuasif yang terbukti efektif untuk berbagai media.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Pilih media template pesan"
          className="flex flex-wrap items-center justify-center gap-space-lg border-b border-border pb-2 w-full max-w-3xl"
        >
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              onClick={() => setTab(t.id)}
              className={`px-space-md py-space-sm text-body-md transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 ${
                t.id === tab
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          className="w-full max-w-3xl bg-surface-container-lowest p-space-lg md:p-space-2xl rounded-xl border border-border shadow-card flex flex-col gap-space-lg"
        >
          <p className="bg-surface-container-low p-space-lg rounded-lg border border-border font-body-lg text-navy-900 leading-relaxed whitespace-pre-line">
            {text}
          </p>
          <div className="flex items-center justify-between flex-wrap gap-space-md">
            <span className="text-body-sm text-slate-600">
              Undang semua pelanggan untuk memberi ulasan jujur, bukan hanya yang puas.
            </span>
            <button
              type="button"
              onClick={copy}
              className="px-space-lg py-space-sm bg-transparent border border-border text-ink-900 hover:bg-blue-50 rounded-lg font-label-md transition-colors flex items-center gap-space-sm min-h-11 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Tersalin' : 'Salin template'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
