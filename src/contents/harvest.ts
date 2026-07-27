import type { PlasmoCSConfig } from "plasmo"

import {
  extractCoverImage,
  extractLinks,
  findProfileForUrl,
  revealHiddenContent,
  waitForContent
} from "~lib/link-parser"
import { ACTIONS, getExtensionApi, type Message, type ScanMessageResponse } from "~lib/messages"
import { getSettings } from "~lib/storage"
import { LOG_PREFIX } from "~lib/utils"
import type { ScanResult } from "~types"

/**
 * Injected broadly because target domains are user-configured at runtime.
 * The profile gate below makes it a no-op on every unconfigured page.
 */
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: false
}

let cachedResult: ScanResult | null = null

async function performScan(): Promise<ScanResult> {
  const settings = await getSettings()
  const profile = findProfileForUrl(settings.profiles, window.location.href)

  if (!profile) {
    throw new Error("No enabled site profile matches this domain.")
  }

  await waitForContent(profile)
  revealHiddenContent(profile)
  // Second pass: reveal triggers often inject their content asynchronously.
  await new Promise((resolve) => setTimeout(resolve, 250))
  revealHiddenContent(profile)

  const links = extractLinks(profile)
  const result: ScanResult = {
    totalCount: links.length,
    links,
    pageUrl: window.location.href,
    pageTitle: document.title.trim() || window.location.hostname,
    coverImage: extractCoverImage(),
    profileId: profile.id,
    profileName: profile.name,
    scannedAt: Date.now()
  }

  cachedResult = result
  return result
}

function registerListener(): void {
  const api = getExtensionApi()
  if (!api) {
    console.warn(`${LOG_PREFIX} Extension API unavailable in content script.`)
    return
  }

  api.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const message = raw as Message | undefined
    if (!message || typeof message.action !== "string") return false

    if (message.action === ACTIONS.PING) {
      sendResponse({ ok: true } satisfies ScanMessageResponse)
      return true
    }

    if (message.action === ACTIONS.GET_LINKS) {
      if (cachedResult) {
        sendResponse({
          ok: true,
          result: { ...cachedResult, cached: true }
        } satisfies ScanMessageResponse)
        return true
      }
      performScan()
        .then((result) => sendResponse({ ok: true, result } satisfies ScanMessageResponse))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Scan failed."
          } satisfies ScanMessageResponse)
        )
      return true
    }

    if (message.action === ACTIONS.SCAN_PAGE) {
      cachedResult = null
      performScan()
        .then((result) => sendResponse({ ok: true, result } satisfies ScanMessageResponse))
        .catch((error: unknown) => {
          console.warn(`${LOG_PREFIX} Scan failed.`, error)
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Scan failed."
          } satisfies ScanMessageResponse)
        })
      return true
    }

    return false
  })
}

registerListener()
