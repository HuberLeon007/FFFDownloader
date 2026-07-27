import { useCallback, useRef, useState } from "react"

import { findProfileForUrl } from "~lib/link-parser"
import {
  ACTIONS,
  getActiveTab,
  sendToContentScript,
  type ScanMessageResponse
} from "~lib/messages"
import { upsertEntryFromScan } from "~lib/storage"
import { LOG_PREFIX } from "~lib/utils"
import type { Link, ScanResult, ScanStatus, Settings } from "~types"

export interface UseScanPage {
  status: ScanStatus
  message: string
  result: ScanResult | null
  links: Link[]
  setLinks: (updater: (current: Link[]) => Link[]) => void
  scan: (mode?: "fresh" | "cached") => Promise<void>
}

export function useScanPage(settings: Settings): UseScanPage {
  const [status, setStatus] = useState<ScanStatus>("idle")
  const [message, setMessage] = useState("Ready. Open a configured page and scan.")
  const [result, setResult] = useState<ScanResult | null>(null)
  const [links, setLinksState] = useState<Link[]>([])
  const running = useRef(false)

  const setLinks = useCallback((updater: (current: Link[]) => Link[]) => {
    setLinksState((current) => updater(current))
  }, [])

  const scan = useCallback(
    async (mode: "fresh" | "cached" = "fresh") => {
      if (running.current) return
      running.current = true
      setStatus("loading")
      setMessage(mode === "cached" ? "Loading cached links…" : "Scanning page…")

      try {
        const tab = await getActiveTab()
        if (!tab?.id || !tab.url) {
          throw new Error("No active tab to scan.")
        }
        if (!/^https?:/i.test(tab.url)) {
          throw new Error("This page type cannot be scanned.")
        }

        const profile = findProfileForUrl(settings.profiles, tab.url)
        if (!profile) {
          setStatus("idle")
          setMessage("No profile matches this domain. Add one in settings.")
          setLinksState([])
          setResult(null)
          return
        }

        const response = await sendToContentScript<ScanMessageResponse>(tab.id, {
          action: mode === "cached" ? ACTIONS.GET_LINKS : ACTIONS.SCAN_PAGE
        }).catch(() => null)

        if (!response) {
          throw new Error("Content script not loaded. Reload the tab and retry.")
        }
        if (!response.ok || !response.result) {
          throw new Error(response.error ?? "Scan failed.")
        }

        setResult(response.result)
        setLinksState(response.result.links)
        setStatus("success")
        setMessage(
          response.result.totalCount === 0
            ? `No links matched "${profile.name}" patterns.`
            : `${response.result.totalCount} link${response.result.totalCount === 1 ? "" : "s"} via ${profile.name}${response.result.cached ? " (cached)" : ""}`
        )

        await upsertEntryFromScan(response.result)
      } catch (error) {
        const text = error instanceof Error ? error.message : "Scan failed."
        console.warn(`${LOG_PREFIX} ${text}`)
        setStatus("error")
        setMessage(text)
      } finally {
        running.current = false
      }
    },
    [settings.profiles]
  )

  return { status, message, result, links, setLinks, scan }
}
