import { motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ACTIONS, requireExtensionApi, sendToBackground } from "~lib/messages"
import { entryIdForUrl } from "~lib/storage"
import { cn, delay, LOG_PREFIX } from "~lib/utils"
import { Header } from "~popup/components/header"
import { SettingsPanel } from "~popup/components/settings-panel"
import { useHistory } from "~popup/hooks/use-history"
import { useScanPage } from "~popup/hooks/use-scan-page"
import { useSettings } from "~popup/hooks/use-settings"
import { HistoryView } from "~popup/views/history-view"
import { ScraperView } from "~popup/views/scraper-view"
import type { DownloadResponse, Link, PopupView } from "~types"

const TABS: { id: PopupView; label: string }[] = [
  { id: "scraper", label: "Scraper" },
  { id: "history", label: "Library" }
]

export default function App() {
  const { settings, ready, update } = useSettings()
  const { status, message, result, links, setLinks, scan } = useScanPage(settings)
  const history = useHistory()

  const [view, setView] = useState<PopupView>("scraper")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [batchCopied, setBatchCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const autoScanned = useRef(false)

  const entryId = useMemo(
    () => (result ? entryIdForUrl(result.pageUrl, result.pageTitle) : null),
    [result]
  )
  const linkStates = useMemo(() => {
    if (!entryId) return {}
    return history.entries.find((entry) => entry.id === entryId)?.linkStates ?? {}
  }, [entryId, history.entries])

  useEffect(() => {
    if (!ready || autoScanned.current || !settings.autoScan) return
    autoScanned.current = true
    void scan("fresh")
  }, [ready, scan, settings.autoScan])

  const flash = useCallback((text: string) => {
    setToast(text)
    setTimeout(() => setToast(null), 2600)
  }, [])

  const toggleLink = useCallback(
    (linkId: string) => {
      setLinks((current) =>
        current.map((link) =>
          link.id === linkId ? { ...link, isSelected: !link.isSelected } : link
        )
      )
    },
    [setLinks]
  )

  const toggleGroup = useCallback(
    (groupName: string, selected: boolean) => {
      setLinks((current) =>
        current.map((link) =>
          link.subGroup === groupName ? { ...link, isSelected: selected } : link
        )
      )
    },
    [setLinks]
  )

  const selectAll = useCallback(
    (selected: boolean) => {
      setLinks((current) => current.map((link) => ({ ...link, isSelected: selected })))
    },
    [setLinks]
  )

  const copyMany = useCallback(
    async (targets: Link[]) => {
      try {
        await navigator.clipboard.writeText(targets.map((link) => link.url).join("\n"))
        setBatchCopied(true)
        setTimeout(() => setBatchCopied(false), 2000)
      } catch (error) {
        console.warn(`${LOG_PREFIX} Batch copy failed.`, error)
        flash("Clipboard blocked by the browser.")
      }
    },
    [flash]
  )

  const downloadOne = useCallback(
    async (link: Link): Promise<boolean> => {
      if (
        settings.confirmBeforeDownload &&
        !window.confirm(`Send "${link.text}" to your download manager?`)
      ) {
        return false
      }
      try {
        const response = await sendToBackground<DownloadResponse>({
          action: ACTIONS.DOWNLOAD,
          payload: { url: link.url, filename: link.text }
        })
        if (!response.success) {
          flash(response.error ?? "Download failed.")
          return false
        }
        if (entryId) await history.markDownloaded(entryId, link.id, link.text)
        return true
      } catch (error) {
        console.error(`${LOG_PREFIX} Download request failed.`, error)
        flash("Could not reach the background worker.")
        return false
      }
    },
    [entryId, flash, history, settings.confirmBeforeDownload]
  )

  const downloadMany = useCallback(
    async (targets: Link[]) => {
      if (targets.length === 0) return
      flash(`Queuing ${targets.length} download${targets.length === 1 ? "" : "s"}…`)
      let ok = 0
      for (const link of targets) {
        const success = await downloadOne(link)
        if (success) ok += 1
        await delay(settings.downloadDelay)
      }
      flash(`${ok}/${targets.length} sent to your download manager.`)
    },
    [downloadOne, flash, settings.downloadDelay]
  )

  const openPage = useCallback((url: string) => {
    try {
      void requireExtensionApi().tabs.create({ url, active: true })
    } catch (error) {
      console.error(`${LOG_PREFIX} Could not open tab.`, error)
    }
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      if (event.key === "Escape" && query) {
        setQuery("")
        return
      }
      if (typing) return
      if (event.key === "Enter") void scan("fresh")
      if (event.key === "a" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        selectAll(true)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [query, scan, selectAll])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-surface-base">
      <Header settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen((v) => !v)} />

      <nav className="flex shrink-0 gap-1 border-b border-line/40 px-3 py-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-label={`Switch to ${tab.label}`}
            aria-current={view === tab.id}
            onClick={() => setView(tab.id)}
            className={cn(
              "relative rounded-full px-3 py-1 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              view === tab.id ? "text-accent" : "text-ink-faint hover:text-ink"
            )}>
            {tab.label}
            {view === tab.id ? (
              <motion.span
                layoutId="hdl-tab"
                className="absolute inset-x-2 -bottom-1.5 h-0.5 rounded-full bg-accent"
              />
            ) : null}
          </button>
        ))}
      </nav>

      <SettingsPanel open={settingsOpen} settings={settings} onChange={update} />

      {view === "scraper" ? (
        <ScraperView
          status={status}
          statusMessage={message}
          links={links}
          linkStates={linkStates}
          query={query}
          hasScanned={result !== null}
          batchCopied={batchCopied}
          onQueryChange={setQuery}
          onScan={() => void scan("fresh")}
          onToggleLink={toggleLink}
          onToggleGroup={toggleGroup}
          onSelectAll={selectAll}
          onDownload={downloadOne}
          onDownloadMany={(targets) => void downloadMany(targets)}
          onCopyMany={(targets) => void copyMany(targets)}
        />
      ) : (
        <HistoryView
          entries={history.entries}
          onFavorite={(id) => void history.favorite(id)}
          onNotes={(id, notes) => void history.setNotes(id, notes)}
          onRemove={(id) => void history.remove(id)}
          onClearAll={() => void history.clearAll()}
          onOpenPage={openPage}
        />
      )}

      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="hdl-glass absolute inset-x-3 bottom-14 z-20 rounded-lg border border-line/50 px-3 py-2 text-[11px] text-ink">
          {toast}
        </motion.div>
      ) : null}
    </div>
  )
}
