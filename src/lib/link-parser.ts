import {
  capitalize,
  execPattern,
  hostMatchesDomains,
  LOG_PREFIX,
  matchesAny,
  toMatcher,
  truncate
} from "~lib/utils"
import type { Link, SiteProfile, SubGroup } from "~types"

const SIZE_PATTERN = /(\d+(?:[.,]\d+)?)\s?(TB|GB|MB|KB)/i
const PART_PATTERN = /[._-](?:part|pt)(\d{2,})/i
const URL_IN_TEXT = /(https?:\/\/[^\s<"')\]]+)/gi

export function findProfileForUrl(profiles: SiteProfile[], pageUrl: string): SiteProfile | null {
  let hostname: string
  try {
    hostname = new URL(pageUrl).hostname
  } catch {
    return null
  }
  return (
    profiles.find(
      (profile) =>
        profile.enabled &&
        profile.matchDomains.length > 0 &&
        hostMatchesDomains(hostname, profile.matchDomains)
    ) ?? null
  )
}

/* ----------------------------- Reveal ----------------------------- */

export function revealHiddenContent(profile: SiteProfile, root: Document = document): number {
  let revealed = 0

  for (const selector of profile.revealSelectors) {
    let nodes: Element[] = []
    try {
      nodes = Array.from(root.querySelectorAll(selector))
    } catch (error) {
      console.warn(`${LOG_PREFIX} Invalid reveal selector "${selector}".`, error)
      continue
    }
    for (const node of nodes) {
      const el = node as HTMLElement
      el.classList.remove("hidden", "hide", "collapsed", "is-collapsed")
      for (const cls of Array.from(el.classList)) {
        if (/(^|-)closed$/.test(cls) || cls.endsWith("-collapsed")) el.classList.remove(cls)
      }
      if (el.hasAttribute("hidden")) el.removeAttribute("hidden")
      if (el.tagName === "DETAILS") (el as HTMLDetailsElement).open = true
      if (el.style.display === "none" || getComputedStyle(el).display === "none") {
        el.style.display = "block"
      }
      el.style.visibility = "visible"
      el.style.maxHeight = "none"
      revealed += 1
    }
  }

  if (profile.revealKeywords.length > 0) {
    const clickable = Array.from(
      root.querySelectorAll<HTMLElement>(
        "a, button, summary, [role='button'], .spoiler-title, [class*='spoiler'], [class*='toggle']"
      )
    )
    for (const el of clickable) {
      const text = (el.textContent ?? "").trim().toLowerCase()
      if (!text || text.length > 120) continue
      if (!profile.revealKeywords.some((keyword) => text.includes(keyword.toLowerCase()))) continue
      try {
        el.click()
        revealed += 1
      } catch (error) {
        console.warn(`${LOG_PREFIX} Could not activate reveal trigger.`, error)
      }
    }
  }

  return revealed
}

export async function waitForContent(
  profile: SiteProfile,
  root: Document = document,
  attempts = 10,
  intervalMs = 300
): Promise<Element | null> {
  const selector = profile.contentSelectors.join(", ")
  for (let i = 0; i < attempts; i += 1) {
    if (selector) {
      try {
        const found = root.querySelector(selector)
        if (found) return found
      } catch (error) {
        console.warn(`${LOG_PREFIX} Invalid content selector list.`, error)
        return root.body
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return root.body ?? null
}

/* --------------------------- Metadata --------------------------- */

export function extractHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "Unknown"
  }
}

export function extractFilename(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hash && parsed.hash.length > 1) {
      return decodeURIComponent(parsed.hash.slice(1))
    }
    const segments = parsed.pathname.split("/").filter(Boolean)
    const last = segments[segments.length - 1]
    if (last) return decodeURIComponent(last)
    return parsed.hostname
  } catch {
    return url
  }
}

export function parsePartNumber(value: string): string | undefined {
  const withoutFragment = value.split("#")[0] ?? value
  const match = PART_PATTERN.exec(withoutFragment)
  if (!match || !match[1]) return undefined
  return `Part ${match[1]}`
}

export function extractFileSize(anchor: Element | null): string | undefined {
  if (!anchor) return undefined
  const candidates = [
    anchor.textContent,
    anchor.parentElement?.textContent,
    anchor.nextSibling?.textContent
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    const match = SIZE_PATTERN.exec(candidate)
    if (match) return `${match[1]?.replace(",", ".")} ${match[2]?.toUpperCase()}`
  }
  return undefined
}

/* -------------------------- Classification -------------------------- */

export function cleanLabel(source: string, stripPrefixes: string[]): string {
  let value = source.replace(/^#/, "")
  value = value.split("/").pop() ?? value
  for (const prefix of stripPrefixes) {
    const normalized = prefix.toLowerCase()
    if (value.toLowerCase().startsWith(normalized)) value = value.slice(normalized.length)
    const fgStyle = new RegExp(`^[a-z]{1,4}-${normalized.replace(/-$/, "")}-`, "i")
    value = value.replace(fgStyle, "")
  }
  value = value
    .replace(/[._-](?:part|pt)\d{2,}/gi, "")
    .replace(/\.(bin|rar|zip|7z|exe|iso|tar|gz)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return capitalize(value)
}

export function classifySubGroup(
  url: string,
  text: string,
  profile: SiteProfile
): { subGroup: string; isOptional: boolean } {
  const fragment = url.includes("#") ? (url.split("#")[1] ?? "") : ""
  const haystack = `${url} ${text} ${fragment}`

  for (const rule of profile.groupRules) {
    const match = execPattern(rule.pattern, haystack)
    if (!match) continue
    const clean = cleanLabel(fragment || extractFilename(url), profile.labelStripPrefixes)
    let label = rule.label
      .replace(/\{match\}/g, capitalize(match[0] ?? ""))
      .replace(/\{clean\}/g, clean || "Extra")
    label = label.replace(/\{([1-9])\}/g, (_, index: string) =>
      capitalize(match[Number(index)] ?? "")
    )
    return { subGroup: label.trim() || rule.label, isOptional: rule.isOptional }
  }

  return { subGroup: profile.defaultGroupName, isOptional: profile.defaultGroupOptional }
}

/* --------------------------- Extraction --------------------------- */

export function isLinkAllowed(url: string, text: string, profile: SiteProfile): boolean {
  const haystack = `${url} ${text}`
  if (profile.excludePatterns.length > 0 && matchesAny(profile.excludePatterns, haystack)) {
    return false
  }
  if (profile.includePatterns.length === 0) return true
  return profile.includePatterns.some((pattern) => toMatcher(pattern)(haystack))
}

interface RawCandidate {
  url: string
  text: string
  anchor: Element | null
}

function collectContainers(profile: SiteProfile, root: Document): Element[] {
  const selector = profile.contentSelectors.join(", ")
  if (!selector) return root.body ? [root.body] : []
  try {
    const found = Array.from(root.querySelectorAll(selector))
    return found.length > 0 ? found : root.body ? [root.body] : []
  } catch {
    return root.body ? [root.body] : []
  }
}

export function extractLinks(profile: SiteProfile, root: Document = document): Link[] {
  const containers = collectContainers(profile, root)
  const seen = new Set<string>()
  const candidates: RawCandidate[] = []

  for (const container of containers) {
    for (const anchor of Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
      const href = anchor.getAttribute("href") ?? ""
      if (!href || href.startsWith("#")) continue
      let absolute: string
      try {
        absolute = new URL(href, root.baseURI).toString()
      } catch {
        continue
      }
      candidates.push({ url: absolute, text: (anchor.textContent ?? "").trim(), anchor })
    }

    const textContent = container.textContent ?? ""
    for (const match of textContent.matchAll(URL_IN_TEXT)) {
      const raw = match[0]?.replace(/[.,;)]+$/, "")
      if (raw) candidates.push({ url: raw, text: "", anchor: null })
    }
  }

  const links: Link[] = []
  const timestamp = Date.now()

  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue
    if (!isLinkAllowed(candidate.url, candidate.text, profile)) continue
    seen.add(candidate.url)

    const filename = extractFilename(candidate.url)
    const displayText =
      candidate.text && candidate.text !== candidate.url ? candidate.text : filename
    const { subGroup, isOptional } = classifySubGroup(candidate.url, displayText, profile)

    links.push({
      id: `link-${links.length}-${timestamp}`,
      url: candidate.url,
      text: truncate(displayText, 200),
      host: extractHost(candidate.url),
      category: profile.id,
      partNumber: parsePartNumber(candidate.url) ?? parsePartNumber(displayText),
      fileSize: extractFileSize(candidate.anchor),
      subGroup,
      isOptional,
      isSelected: !isOptional
    })
  }

  return links
}

export function buildSubGroups(links: Link[]): SubGroup[] {
  const map = new Map<string, SubGroup>()
  for (const link of links) {
    const existing = map.get(link.subGroup)
    if (existing) {
      existing.links.push(link)
    } else {
      map.set(link.subGroup, {
        name: link.subGroup,
        isOptional: link.isOptional,
        links: [link]
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.isOptional !== b.isOptional) return a.isOptional ? 1 : -1
    return a.name.localeCompare(b.name)
  })
}

export function extractCoverImage(root: Document = document): string | undefined {
  const meta = root.querySelector<HTMLMetaElement>("meta[property='og:image']")
  return meta?.content || undefined
}
