import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const LOG_PREFIX = "[HarvestDL]"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Hyphen is escaped so TypeScript does not parse it as a character range.
const ILLEGAL_FILENAME_CHARS = /[\x00-\x1F\\/:*?"<>|\-]/g

export function sanitizeFilename(input: string): string {
  const collapsed = input.replace(ILLEGAL_FILENAME_CHARS, "").replace(/\s+/g, " ").trim()
  const stripped = collapsed.replace(/^\.+/, "").trim()
  return stripped.slice(0, 240).trim()
}

export function validateUrl(url: string): boolean {
  if (typeof url !== "string" || url.trim().length === 0) return false
  const value = url.trim()
  if (value.toLowerCase().startsWith("magnet:")) return /xt=urn:btih:[a-z0-9]+/i.test(value)
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "entry"
}

export function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function toMatcher(pattern: string): (value: string) => boolean {
  const trimmed = pattern.trim()
  if (trimmed.length === 0) return () => false
  const regexMatch = /^\/(.+)\/([gimsuy]*)$/.exec(trimmed)
  if (regexMatch) {
    const [, body, flags] = regexMatch
    try {
      const re = new RegExp(body as string, (flags ?? "").replace(/g/g, ""))
      return (value: string) => re.test(value)
    } catch {
      // Invalid regexes degrade to substring matching.
    }
  }
  const needle = trimmed.toLowerCase()
  return (value: string) => value.toLowerCase().includes(needle)
}

export function matchesAny(patterns: string[], value: string): boolean {
  return patterns.some((pattern) => toMatcher(pattern)(value))
}

export function execPattern(pattern: string, value: string): RegExpExecArray | null {
  const trimmed = pattern.trim()
  const regexMatch = /^\/(.+)\/([gimsuy]*)$/.exec(trimmed)
  if (regexMatch) {
    const [, body, flags] = regexMatch
    try {
      return new RegExp(body as string, (flags ?? "").replace(/g/g, "")).exec(value)
    } catch {
      return null
    }
  }
  const index = value.toLowerCase().indexOf(trimmed.toLowerCase())
  if (index === -1) return null
  const result = [value.slice(index, index + trimmed.length)] as unknown as RegExpExecArray
  result.index = index
  result.input = value
  return result
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return "just now"
  if (diff < hour) {
    const n = Math.floor(diff / minute)
    return `${n} minute${n === 1 ? "" : "s"} ago`
  }
  if (diff < day) {
    const n = Math.floor(diff / hour)
    return `${n} hour${n === 1 ? "" : "s"} ago`
  }
  const n = Math.floor(diff / day)
  if (n < 30) return `${n} day${n === 1 ? "" : "s"} ago`
  const months = Math.floor(n / 30)
  return `${months} month${months === 1 ? "" : "s"} ago`
}

export function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "")
}

export function hostMatchesDomains(hostname: string, domains: string[]): boolean {
  const host = normalizeHostname(hostname)
  return domains.some((raw) => {
    const domain = normalizeHostname(raw)
    return Boolean(domain) && (host === domain || host.endsWith(`.${domain}`))
  })
}

export function uniqueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`
}
