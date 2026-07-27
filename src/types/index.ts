// ---- Site profiles (replaces every hardcoded domain) ----

/** Pattern syntax: plain substring (case-insensitive) or `/regex/flags`. */
export type Pattern = string

export interface GroupRule {
  id: string
  /** Supports {match}, {clean} and {1}..{9} capture-group placeholders. */
  label: string
  pattern: Pattern
  isOptional: boolean
}

export interface SiteProfile {
  id: string
  name: string
  enabled: boolean
  /** Page hostnames this profile applies to. Empty = never auto-matches. */
  matchDomains: string[]
  /** CSS selectors of the containers to scrape. */
  contentSelectors: string[]
  /** A link must match at least one of these to be harvested. Empty = allow all. */
  includePatterns: Pattern[]
  /** A link matching any of these is dropped, even if included. */
  excludePatterns: Pattern[]
  /** Selectors of collapsed/hidden containers to force open before scraping. */
  revealSelectors: string[]
  /** Lowercase text fragments of "click to expand" triggers. */
  revealKeywords: string[]
  /** Ordered classification rules. First match wins. */
  groupRules: GroupRule[]
  /** Prefixes stripped when deriving a {clean} label. */
  labelStripPrefixes: string[]
  defaultGroupName: string
  defaultGroupOptional: boolean
}

// ---- Core data ----

export interface Link {
  id: string
  url: string
  text: string
  host: string
  /** Id of the profile that harvested this link. */
  category: string
  partNumber?: string
  fileSize?: string
  subGroup: string
  isOptional: boolean
  isSelected: boolean
}

export interface SubGroup {
  name: string
  isOptional: boolean
  links: Link[]
}

export interface ScanResult {
  totalCount: number
  links: Link[]
  pageUrl: string
  pageTitle: string
  coverImage?: string
  profileId: string | null
  profileName: string | null
  scannedAt: number
  cached?: boolean
}

// ---- Download manager integration ----

export type DownloadManagerType = "browser-native" | "jdownloader2" | "aria2" | "custom"

export interface DownloadManagerConfig {
  type: DownloadManagerType
  label: string
  enabled: boolean
  host?: string
  port?: number
  secret?: string
  /** Custom strategy only: URL template with {url} and {filename}. */
  template?: string
}

// ---- Settings ----

export interface Settings {
  autoScan: boolean
  downloadDelay: number
  downloadManager: DownloadManagerType
  downloadManagers: DownloadManagerConfig[]
  confirmBeforeDownload: boolean
  groupBySubgroup: boolean
  profiles: SiteProfile[]
}

// ---- Library / history ----

export interface LinkState {
  downloaded: boolean
  downloadedAt?: number
  fileName?: string
}

export interface LibraryEntry {
  id: string
  pageUrl: string
  title: string
  coverImage?: string
  scannedAt: number
  lastDownloadedAt?: number
  totalLinks: number
  downloadedLinks: number
  isFavorite: boolean
  notes?: string
  linkStates: Record<string, LinkState>
}

// ---- Messaging payloads ----

export interface DownloadRequest {
  url: string
  filename?: string
}

export interface DownloadResponse {
  success: boolean
  error?: string
  downloadId?: number
  via?: DownloadManagerType
}

export interface TestConnectionRequest {
  type: DownloadManagerType
}

export interface TestConnectionResponse {
  success: boolean
  error?: string
}

// ---- UI ----

export type ScanStatus = "idle" | "loading" | "success" | "error"
export type PopupView = "scraper" | "history"
export type LibrarySort = "recent" | "name" | "favorites"
