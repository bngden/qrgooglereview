import type { MetadataRoute } from 'next'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

/** /r/, /admin, /reset dan layar status tidak boleh diindeks (PRD §11 / T2.10). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: ['/r/', '/admin', '/reset', '/status'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
