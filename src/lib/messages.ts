import type { ScanResult } from "~types"

export const ACTIONS = {
  // Popup -> Content script
  SCAN_PAGE: "SCAN_PAGE",
  GET_LINKS: "GET_LINKS",
  PING: "PING",

  // Content script -> Popup
  LINKS_EXTRACTED: "LINKS_EXTRACTED",

  // Popup -> Background
  DOWNLOAD: "DOWNLOAD",
  TEST_CONNECTION: "TEST_CONNECTION",

  // Background -> Popup
  DOWNLOAD_COMPLETE: "DOWNLOAD_COMPLETE",

  // Generic
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  ERROR: "ERROR"
} as const

export type ActionName = (typeof ACTIONS)[keyof typeof ACTIONS]

export interface Message<P = unknown> {
  action: ActionName
  payload?: P
}

export interface ScanMessageResponse {
  ok: boolean
  result?: ScanResult
  error?: string
}

/* ------------------------------------------------------------------ *
 * Cross-browser API access. Never touch `chrome.*` or `browser.*`
 * directly anywhere else in the codebase.
 * ------------------------------------------------------------------ */

interface MinimalTab {
  id?: number
  url?: string
  title?: string
  active?: boolean
}

export interface DownloadDelta {
  id: number
  state?: { current?: string }
  error?: { current?: string }
}

export interface ExtensionApi {
  runtime: {
    sendMessage: (message: unknown) => Promise<unknown>
    onMessage: {
      addListener: (
        cb: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void
        ) => boolean | void | Promise<unknown>
      ) => void
    }
    getManifest: () => { version: string }
    lastError?: { message?: string } | undefined
  }
  tabs: {
    query: (info: { active?: boolean; currentWindow?: boolean }) => Promise<MinimalTab[]>
    sendMessage: (tabId: number, message: unknown) => Promise<unknown>
    create: (props: { url: string; active?: boolean }) => Promise<MinimalTab>
    remove: (tabId: number) => Promise<void>
  }
  downloads: {
    download: (options: {
      url: string
      filename?: string
      saveAs?: boolean
      conflictAction?: string
    }) => Promise<number>
    onChanged: {
      addListener: (cb: (delta: DownloadDelta) => void) => void
    }
  }
  storage: {
    local: {
      get: (keys: string | string[] | null) => Promise<Record<string, unknown>>
      set: (items: Record<string, unknown>) => Promise<void>
    }
  }
}

export function getExtensionApi(): ExtensionApi | null {
  const g = globalThis as Record<string, unknown>
  const chromeApi = g["chrome"] as { runtime?: unknown } | undefined
  if (chromeApi && chromeApi.runtime) return chromeApi as unknown as ExtensionApi
  const browserApi = g["browser"] as { runtime?: unknown } | undefined
  if (browserApi && browserApi.runtime) return browserApi as unknown as ExtensionApi
  return null
}

export function requireExtensionApi(): ExtensionApi {
  const api = getExtensionApi()
  if (!api) throw new Error("No WebExtension API available in this context.")
  return api
}

export async function sendToBackground<T>(message: Message): Promise<T> {
  const api = requireExtensionApi()
  const response = await api.runtime.sendMessage(message)
  return response as T
}

export async function sendToContentScript<T>(tabId: number, message: Message): Promise<T> {
  const api = requireExtensionApi()
  const response = await api.tabs.sendMessage(tabId, message)
  return response as T
}

export async function getActiveTab(): Promise<MinimalTab | null> {
  const api = requireExtensionApi()
  const tabs = await api.tabs.query({ active: true, currentWindow: true })
  return tabs[0] ?? null
}

export function getVersion(): string {
  const api = getExtensionApi()
  try {
    return api?.runtime.getManifest().version ?? "0.0.0"
  } catch {
    return "0.0.0"
  }
}
