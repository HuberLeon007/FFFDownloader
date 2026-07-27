import { requireExtensionApi } from "~lib/messages"
import { LOG_PREFIX, slugify, uniqueId } from "~lib/utils"
import type {
  DownloadManagerConfig,
  LibraryEntry,
  LinkState,
  ScanResult,
  Settings,
  SiteProfile
} from "~types"

export const STORAGE_KEYS = {
  settings: "hdl_settings",
  library: "hdl_library"
} as const

export const DEFAULT_MANAGERS: DownloadManagerConfig[] = [
  {
    type: "browser-native",
    label: "Browser Native (IDM, AB Download Manager, etc.)",
    enabled: true
  },
  { type: "jdownloader2", label: "JDownloader 2", enabled: false, host: "127.0.0.1", port: 9666 },
  { type: "aria2", label: "aria2", enabled: false, host: "127.0.0.1", port: 6800, secret: "" },
  {
    type: "custom",
    label: "Custom endpoint",
    enabled: false,
    template: "http://127.0.0.1:8080/add?url={url}&name={filename}"
  }
]

/** A neutral starter profile. Add your own domains to switch it on. */
export function createStarterProfile(): SiteProfile {
  return {
    id: uniqueId("profile"),
    name: "New profile",
    enabled: false,
    matchDomains: [],
    contentSelectors: [".entry-content", "#plaintext", "#prettyprint", "article", "main"],
    includePatterns: ["/\\.(rar|zip|7z|iso|bin|tar\\.gz)(\\?|#|$)/i"],
    excludePatterns: [
      "facebook.com",
      "twitter.com",
      "x.com",
      "instagram.com",
      "youtube.com",
      "discord.gg",
      "reddit.com",
      "patreon.com",
      "paypal",
      "buymeacoffee",
      "ko-fi.com",
      "/category/",
      "/tag/",
      "/author/",
      "/page/",
      "/feed",
      "javascript:",
      "mailto:",
      "tel:",
      "/cdn-cgi/",
      "wp-content/plugins",
      "wp-admin"
    ],
    revealSelectors: [
      ".spoiler",
      ".spoiler-content",
      ".collapse-content",
      "details",
      "[hidden]",
      "[style*='display: none']",
      "[style*='display:none']"
    ],
    revealKeywords: [
      "click to show",
      "show download",
      "show links",
      "reveal links",
      "show more",
      "mirrors"
    ],
    groupRules: [
      {
        id: uniqueId("rule"),
        label: "Optional: Soundtracks & Bonus",
        pattern: "/(soundtrack|bonus|ost)/i",
        isOptional: true
      },
      {
        id: uniqueId("rule"),
        label: "Optional Language: {1}",
        pattern:
          "/(english|french|german|italian|japanese|korean|polish|russian|spanish|chinese|portuguese|brazilian|turkish|arabic)/i",
        isOptional: true
      },
      {
        id: uniqueId("rule"),
        label: "Optional: {clean}",
        pattern: "/optional|selective/i",
        isOptional: true
      }
    ],
    labelStripPrefixes: ["optional-", "selective-", "opt-"],
    defaultGroupName: "Main Files (Required)",
    defaultGroupOptional: false
  }
}

export const DEFAULT_SETTINGS: Settings = {
  autoScan: false,
  downloadDelay: 1000,
  downloadManager: "browser-native",
  downloadManagers: DEFAULT_MANAGERS,
  confirmBeforeDownload: false,
  groupBySubgroup: true,
  profiles: []
}

function mergeSettings(stored: Partial<Settings> | undefined): Settings {
  if (!stored) return { ...DEFAULT_SETTINGS, downloadManagers: [...DEFAULT_MANAGERS] }
  const managers = DEFAULT_MANAGERS.map((fallback) => {
    const found = stored.downloadManagers?.find((m) => m.type === fallback.type)
    return found ? { ...fallback, ...found } : fallback
  })
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    downloadManagers: managers,
    profiles: Array.isArray(stored.profiles) ? stored.profiles : []
  }
}

export async function getSettings(): Promise<Settings> {
  try {
    const api = requireExtensionApi()
    const data = await api.storage.local.get(STORAGE_KEYS.settings)
    return mergeSettings(data[STORAGE_KEYS.settings] as Partial<Settings> | undefined)
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to read settings.`, error)
    return mergeSettings(undefined)
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    const api = requireExtensionApi()
    await api.storage.local.set({ [STORAGE_KEYS.settings]: settings })
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to persist settings.`, error)
    throw new Error("Could not save settings.")
  }
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  await saveSettings(next)
  return next
}

/* ------------------------- Library / history ------------------------- */

function sortLibrary(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((a, b) => {
    const aTime = a.lastDownloadedAt ?? 0
    const bTime = b.lastDownloadedAt ?? 0
    if (aTime !== bTime) return bTime - aTime
    return b.scannedAt - a.scannedAt
  })
}

export async function getLibrary(): Promise<LibraryEntry[]> {
  try {
    const api = requireExtensionApi()
    const data = await api.storage.local.get(STORAGE_KEYS.library)
    const raw = data[STORAGE_KEYS.library]
    return Array.isArray(raw) ? sortLibrary(raw as LibraryEntry[]) : []
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to read library.`, error)
    return []
  }
}

async function writeLibrary(entries: LibraryEntry[]): Promise<LibraryEntry[]> {
  const sorted = sortLibrary(entries)
  const api = requireExtensionApi()
  await api.storage.local.set({ [STORAGE_KEYS.library]: sorted })
  return sorted
}

export function entryIdForUrl(pageUrl: string, title: string): string {
  try {
    const parsed = new URL(pageUrl)
    const path = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop()
    return slugify(`${parsed.hostname}-${path ?? title}`)
  } catch {
    return slugify(title)
  }
}

export async function upsertEntryFromScan(result: ScanResult): Promise<LibraryEntry[]> {
  const library = await getLibrary()
  const id = entryIdForUrl(result.pageUrl, result.pageTitle)
  const existing = library.find((entry) => entry.id === id)
  const next: LibraryEntry = {
    id,
    pageUrl: result.pageUrl,
    title: result.pageTitle || result.pageUrl,
    coverImage: result.coverImage ?? existing?.coverImage,
    scannedAt: result.scannedAt,
    lastDownloadedAt: existing?.lastDownloadedAt,
    totalLinks: result.totalCount,
    downloadedLinks: existing?.downloadedLinks ?? 0,
    isFavorite: existing?.isFavorite ?? false,
    notes: existing?.notes ?? "",
    linkStates: existing?.linkStates ?? {}
  }
  const others = library.filter((entry) => entry.id !== id)
  return writeLibrary([...others, next])
}

export async function markLinkDownloaded(
  entryId: string,
  linkId: string,
  fileName?: string
): Promise<LibraryEntry[]> {
  const library = await getLibrary()
  const entry = library.find((item) => item.id === entryId)
  if (!entry) return library
  const alreadyDone = entry.linkStates[linkId]?.downloaded === true
  const state: LinkState = { downloaded: true, downloadedAt: Date.now(), fileName }
  const updated: LibraryEntry = {
    ...entry,
    lastDownloadedAt: Date.now(),
    downloadedLinks: alreadyDone ? entry.downloadedLinks : entry.downloadedLinks + 1,
    linkStates: { ...entry.linkStates, [linkId]: state }
  }
  return writeLibrary(library.map((item) => (item.id === entryId ? updated : item)))
}

export async function toggleFavorite(entryId: string): Promise<LibraryEntry[]> {
  const library = await getLibrary()
  return writeLibrary(
    library.map((entry) =>
      entry.id === entryId ? { ...entry, isFavorite: !entry.isFavorite } : entry
    )
  )
}

export async function updateNotes(entryId: string, notes: string): Promise<LibraryEntry[]> {
  const library = await getLibrary()
  return writeLibrary(
    library.map((entry) =>
      entry.id === entryId ? { ...entry, notes: notes.slice(0, 2000) } : entry
    )
  )
}

export async function deleteEntry(entryId: string): Promise<LibraryEntry[]> {
  const library = await getLibrary()
  return writeLibrary(library.filter((entry) => entry.id !== entryId))
}

export async function clearLibrary(): Promise<LibraryEntry[]> {
  return writeLibrary([])
}
