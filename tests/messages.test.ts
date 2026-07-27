import { afterEach, describe, expect, it, vi } from "vitest"

import { ACTIONS, getActiveTab, sendToBackground, sendToContentScript } from "~lib/messages"

const g = globalThis as Record<string, unknown>

afterEach(() => {
  delete g["chrome"]
  delete g["browser"]
})

describe("sendToBackground", () => {
  it("calls the runtime API of whichever namespace exists", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ success: true })
    g["chrome"] = { runtime: { sendMessage } }

    const response = await sendToBackground<{ success: boolean }>({ action: ACTIONS.DOWNLOAD })

    expect(sendMessage).toHaveBeenCalledWith({ action: ACTIONS.DOWNLOAD })
    expect(response.success).toBe(true)
  })

  it("falls back to the browser namespace", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ success: false })
    g["browser"] = { runtime: { sendMessage } }

    await sendToBackground({ action: ACTIONS.TEST_CONNECTION })

    expect(sendMessage).toHaveBeenCalledOnce()
  })

  it("throws when no extension API is present", async () => {
    await expect(sendToBackground({ action: ACTIONS.DOWNLOAD })).rejects.toThrow(
      /No WebExtension API/
    )
  })
})

describe("sendToContentScript", () => {
  it("calls the tabs API with the tab id", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true })
    g["chrome"] = { runtime: {}, tabs: { sendMessage } }

    await sendToContentScript(42, { action: ACTIONS.SCAN_PAGE })

    expect(sendMessage).toHaveBeenCalledWith(42, { action: ACTIONS.SCAN_PAGE })
  })
})

describe("getActiveTab", () => {
  it("returns the first active tab", async () => {
    g["chrome"] = {
      runtime: {},
      tabs: { query: vi.fn().mockResolvedValue([{ id: 7, url: "https://example.com" }]) }
    }
    const tab = await getActiveTab()
    expect(tab?.id).toBe(7)
  })

  it("returns null when nothing is active", async () => {
    g["chrome"] = { runtime: {}, tabs: { query: vi.fn().mockResolvedValue([]) } }
    expect(await getActiveTab()).toBeNull()
  })
})
