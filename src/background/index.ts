import { startDownload, testConnection } from "~lib/download-trigger"
import { ACTIONS, getExtensionApi, type DownloadDelta, type Message } from "~lib/messages"
import { getSettings } from "~lib/storage"
import { LOG_PREFIX } from "~lib/utils"
import type { DownloadRequest, DownloadResponse, TestConnectionRequest } from "~types"

const api = getExtensionApi()

if (!api) {
  console.error(`${LOG_PREFIX} Background worker could not resolve the extension API.`)
} else {
  api.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const message = raw as Message | undefined
    if (!message || typeof message.action !== "string") return false

    if (message.action === ACTIONS.DOWNLOAD) {
      const payload = message.payload as DownloadRequest | undefined
      if (!payload?.url) {
        sendResponse({ success: false, error: "No URL provided." } satisfies DownloadResponse)
        return true
      }
      getSettings()
        .then((settings) => startDownload(payload.url, payload.filename, settings))
        .then((response) => sendResponse(response))
        .catch((error: unknown) => {
          console.error(`${LOG_PREFIX} Download dispatch failed.`, error)
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Download failed."
          } satisfies DownloadResponse)
        })
      return true
    }

    if (message.action === ACTIONS.TEST_CONNECTION) {
      const payload = message.payload as TestConnectionRequest | undefined
      if (!payload?.type) {
        sendResponse({ success: false, error: "No manager specified." })
        return true
      }
      getSettings()
        .then((settings) => testConnection(payload.type, settings))
        .then((response) => sendResponse(response))
        .catch((error: unknown) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Connection test failed."
          })
        )
      return true
    }

    return false
  })

  api.downloads.onChanged.addListener((delta: DownloadDelta) => {
    if (delta.state?.current === "interrupted") {
      console.warn(
        `${LOG_PREFIX} Download ${delta.id} was interrupted.`,
        delta.error?.current ?? "unknown reason"
      )
    }
  })
}

export {}
