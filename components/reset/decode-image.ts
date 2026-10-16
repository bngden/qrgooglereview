import jsQR from 'jsqr'

/**
 * Decode QR dari file gambar sepenuhnya di browser.
 * Gambar TIDAK pernah dikirim ke server (PRD §7.7).
 */
export async function decodeImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Gambar tidak bisa dibaca'))
      el.src = url
    })

    const MAX = 1600
    const scale = Math.min(1, MAX / Math.max(img.width, img.height))
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, width, height)

    const data = ctx.getImageData(0, 0, width, height)
    const result = jsQR(data.data, width, height, { inversionAttempts: 'attemptBoth' })
    return result?.data ?? null
  } finally {
    URL.revokeObjectURL(url)
  }
}
