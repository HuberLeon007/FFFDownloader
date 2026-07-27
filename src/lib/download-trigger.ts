import { requireExtensionApi } from "~lib/messages"
import { LOG_PREFIX, sanitizeFilename, validateUrl } from "~lib/utils"
import type {
  DownloadManagerConfig,
  DownloadManagerType,
  DownloadResponse,
  Settings
} from "~types"

const REQUEST_TIMEOUT_MS = 4000

function friendlyError(raw: string): string {
  const value = raw.toUpperCase()
  if (value.includes("SERVER_FAILED") || value.includes("NETWORK")) {
    return "Network error. The file host may be blocking direct downloads."
  }
  if (value.includes("FILE_FAILED") || value.includes("FORBIDDEN")) {
    return "Access denied. The file host may require a browser visit first."
  }
  if (value.includes("USER_CANCELED")) return "Download canceled."
  return raw
}

function configFor(
  settings: Settings,
  type: DownloadManagerType
): DownloadManagerConfig | undefined {
  return settings.downloadManagers.find((manager) => manager.type === type)
}

async function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function triggerMagnet(url: string): Promise<DownloadResponse> {
  try {
    const api = requireExtensionApi()
    const tab = await api.tabs.create({ url, active: false })
    if (typeof tab.id === "number") {
      const tabId = tab.id
      setTimeout(() => {
        api.tabs.remove(tabId).catch(() => undefined)
      }, 2000)
    }
    return { success: true, via: "browser-native" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? friendlyError(error.message) : "Could not open magnet link."
    }
  }
}

export async function triggerNative(url: string, filename?: string): Promise<DownloadResponse> {
  try {
    const api = requireExtensionApi()
    const downloadId = await api.downloads.download({
      url,
      filename: filename ? sanitizeFilename(filename) : undefined,
      saveAs: false,
      conflictAction: "uniquify"
    })
    return { success: true, downloadId, via: "browser-native" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed."
    return { success: false, error: friendlyError(message), via: "browser-native" }
  }
}

async function triggerJDownloader(
  url: string,
  filename: string | undefined,
  config: DownloadManagerConfig | undefined
): Promise<DownloadResponse> {
  const host = config?.host?.trim() || "127.0.0.1"
  const port = config?.port ?? 9666
  const body = new URLSearchParams({
    url,
    autostart: "1",
    ...(filename ? { filename: sanitizeFilename(filename) } : {})
  })
  try {
    const response = await fetchWithTimeout(`http://${host}:${port}/flashgot`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    })
    if (!response.ok) throw new Error(`JDownloader responded ${response.status}`)
    return { success: true, via: "jdownloader2" }
  } catch (error) {
    console.warn(`${LOG_PREFIX} JDownloader unreachable, falling back to browser.`, error)
    const fallback = await triggerNative(url, filename)
    return fallback.success
      ? fallback
      : { success: false, error: "JDownloader 2 is not running and the browser fallback failed." }
  }
}

async function triggerAria2(
  url: string,
  filename: string | undefined,
  config: DownloadManagerConfig | undefined
): Promise<DownloadResponse> {
  const host = config?.host?.trim() || "127.0.0.1"
  const port = config?.port ?? 6800
  const secret = config?.secret?.trim()
  const params: unknown[] = secret ? [`token:${secret}`] : []
  params.push([url])
  if (filename) params.push({ out: sanitizeFilename(filename) })

  try {
    const response = await fetchWithTimeout(`http://${host}:${port}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "aria2.addUri", params, id: Date.now() })
    })
    if (!response.ok) throw new Error(`aria2 responded ${response.status}`)
    const payload = (await response.json()) as { error?: { message?: string } }
    if (payload.error) throw new Error(payload.error.message ?? "aria2 rejected the request.")
    return { success: true, via: "aria2" }
  } catch (error) {
    console.warn(`${LOG_PREFIX} aria2 request failed, falling back to browser.`, error)
    const fallback = await triggerNative(url, filename)
    return fallback.success
      ? fallback
      : { success: false, error: "aria2 is unreachable and the browser fallback failed." }
  }
}

async function triggerCustom(
  url: string,
  filename: string | undefined,
  config: DownloadManagerConfig | undefined
): Promise<DownloadResponse> {
  const template = config?.template?.trim()
  if (!template) {
    return { success: false, error: "No custom endpoint configured." }
  }
  const endpoint = template
    .replace(/\{url\}/g, encodeURIComponent(url))
    .replace(/\{filename\}/g, encodeURIComponent(filename ? sanitizeFilename(filename) : ""))
  try {
    const response = await fetchWithTimeout(endpoint, { method: "GET" })
    if (!response.ok) throw new Error(`Endpoint responded ${response.status}`)
    return { success: true, via: "custom" }
  } catch (error) {
    console.warn(`${LOG_PREFIX} Custom endpoint failed, falling back to browser.`, error)
    const fallback = await triggerNative(url, filename)
    return fallback.success
      ? fallback
      : { success: false, error: "Custom endpoint is unreachable and the fallback failed." }
  }
}

export async function startDownload(
  url: string,
  filename: string | undefined,
  settings: Settings
): Promise<DownloadResponse> {
  if (!validateUrl(url)) {
    return { success: false, error: "That URL is not a valid download target." }
  }
  if (url.toLowerCase().startsWith("magnet:")) return triggerMagnet(url)

  const strategy = settings.downloadManager
  const config = configFor(settings, strategy)

  switch (strategy) {
    case "jdownloader2":
      return triggerJDownloader(url, filename, config)
    case "aria2":
      return triggerAria2(url, filename, config)
    case "custom":
      return triggerCustom(url, filename, config)
    case "browser-native":
    default:
      return triggerNative(url, filename)
  }
}

export async function testConnection(
  type: DownloadManagerType,
  settings: Settings
): Promise<{ success: boolean; error?: string }> {
  const config = configFor(settings, type)
  try {
    if (type === "browser-native") {
      const api = requireExtensionApi()
      return { success: Boolean(api.downloads), error: undefined }
    }
    if (type === "jdownloader2") {
      const host = config?.host?.trim() || "127.0.0.1"
      const port = config?.port ?? 9666
      const response = await fetchWithTimeout(`http://${host}:${port}/jdcheckjs`)
      return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` }
    }
    if (type === "aria2") {
      const host = config?.host?.trim() || "127.0.0.1"
      const port = config?.port ?? 6800
      const secret = config?.secret?.trim()
      const params = secret ? [`token:${secret}`] : []
      const response = await fetchWithTimeout(`http://${host}:${port}/jsonrpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "aria2.getVersion",
          params,
          id: Date.now()
        })
      })
      const payload = (await response.json()) as { error?: { message?: string } }
      if (payload.error) return { success: false, error: payload.error.message ?? "Rejected." }
      return { success: response.ok }
    }
    const template = config?.template?.trim()
    if (!template) return { success: false, error: "No endpoint configured." }
    const probe = template.replace(/\{url\}/g, "").replace(/\{filename\}/g, "")
    const response = await fetchWithTimeout(probe)
    return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed."
    }
  }
}
