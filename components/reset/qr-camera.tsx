'use client'

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

type Props = {
  onDetected: (text: string) => void
  onClose: () => void
}

/**
 * Pemindai QR di browser: kamera hanya diminta ketika komponen ini dipasang
 * (artinya pengguna baru menekan tombol scan). Tidak ada gambar yang dikirim ke server.
 */
export function QrCamera({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const stopped = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Perangkat ini tidak mendukung kamera. Gunakan kolom ID atau unggah gambar QR.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
      } catch {
        setError('Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, atau ketik ID QR dan unggah gambar.')
        return
      }

      const video = videoRef.current
      if (!video || stopped.current) {
        stream?.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        setError('Kamera tidak bisa dijalankan. Gunakan kolom ID QR sebagai gantinya.')
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      const tick = () => {
        if (stopped.current) return
        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx && video.videoWidth) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const found = jsQR(data.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' })
          if (found?.data) {
            onDetected(found.data)
            return
          }
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    void start()

    return () => {
      stopped.current = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-gutter">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg flex flex-col gap-space-md shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-xs text-navy-900">Pindai QR</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemindai"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error ? (
          <div className="bg-warning-bg rounded-lg p-space-md flex items-start gap-3" role="alert">
            <span aria-hidden="true" className="material-symbols-outlined text-warning text-[20px] mt-0.5">
              warning
            </span>
            <p className="text-body-md text-warning">{error}</p>
          </div>
        ) : (
          <>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <div
                aria-hidden="true"
                className="absolute inset-8 border-2 border-blue-500 rounded-xl shadow-[0_0_0_9999px_rgba(10,31,68,0.45)]"
              />
            </div>
            <p className="text-body-sm text-slate-600 text-center">
              Arahkan kamera ke QR. Tautan QR ReviewQR mengandung <span className="font-mono">/r/</span>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
