/**
 * Analytics: User-Agent parser
 */
import { UAParser } from 'ua-parser-js'

export type DeviceCategory = 'mobile' | 'desktop' | 'tablet' | 'unknown'

export interface ParsedUA {
  device: DeviceCategory
  os: string
  browser: string
}

export function parseUserAgent(ua: string): ParsedUA {
  if (!ua) return { device: 'unknown', os: 'unknown', browser: 'unknown' }

  const parser = new UAParser(ua)
  const result = parser.getResult()

  const deviceType = result.device?.type?.toLowerCase() ?? ''
  let device: DeviceCategory = 'unknown'
  if (deviceType === 'mobile') device = 'mobile'
  else if (deviceType === 'tablet') device = 'tablet'
  else if (result.os?.name) device = 'desktop'

  const os = result.os?.name ?? 'unknown'
  const browser = result.browser?.name ?? 'unknown'

  return { device, os, browser }
}

/** Daftar bot/crawler UA patterns */
const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /scraper/i,
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /slackbot/i,
  /discordbot/i,
  /facebookexternalhit/i,
  /preview/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /ahrefs/i,
  /semrush/i,
  /semrush/i,
]

export function isBot(ua: string): boolean {
  if (!ua) return false
  return BOT_PATTERNS.some((pattern) => pattern.test(ua))
}
