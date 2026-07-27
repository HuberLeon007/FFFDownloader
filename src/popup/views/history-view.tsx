import { motion } from "framer-motion"
import { ArrowLeft, RefreshCw, Star, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { cn, formatRelativeTime } from "~lib/utils"
import type { LibraryEntry, LibrarySort } from "~types"

interface HistoryViewProps {
  entries: LibraryEntry[]
  onFavorite: (entryId: string) => void
  onNotes: (entryId: string, notes: string) => void
  onRemove: (entryId: string) => void
  onClearAll: () => void
  onOpenPage: (url: string) => void
}

const SORTS: { value: LibrarySort; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "Name" },
  { value: "favorites", label: "Favorites" }
]

export function HistoryView({
  entries,
  onFavorite,
  onNotes,
  onRemove,
  onClearAll,
  onOpenPage
}: HistoryViewProps) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<LibrarySort>("recent")
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? entries.filter((entry) => entry.title.toLowerCase().includes(needle))
      : entries
    const sorted = [...filtered]
    if (sort === "name") sorted.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === "favorites") {
      sorted.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
    }
    return sorted
  }, [entries, query, sort])

  const detail = openId ? entries.find((entry) => entry.id === openId) : null

  if (detail) {
    const pct =
      detail.totalLinks > 0 ? Math.round((detail.downloadedLinks / detail.totalLinks) * 100) : 0
    return (
      <div className="hdl-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <button
          type="button"
          aria-label="Back to library"
          onClick={() => setOpenId(null)}
          className="flex w-fit items-center gap-1 text-[11px] text-ink-muted hover:text-accent">
          <ArrowLeft className="h-3.5 w-3.5" /> Library
        </button>
        <h2 className="text-sm font-semibold text-ink">{detail.title}</h2>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className="h-full rounded-full bg-accent"
          />
        </div>
        <p className="text-[10px] text-ink-faint">
          {detail.downloadedLinks}/{detail.totalLinks} parts downloaded · scanned{" "}
          {formatRelativeTime(detail.scannedAt)}
        </p>
        <label className="block">
          <span className="mb-1 block text-[9px] uppercase tracking-wide text-ink-faint">
            Notes
          </span>
          <textarea
            rows={5}
            defaultValue={detail.notes ?? ""}
            maxLength={2000}
            aria-label="Notes for this entry"
            onBlur={(event) => onNotes(detail.id, event.target.value)}
            className="hdl-scroll w-full resize-y rounded-md border border-line/50 bg-surface-base p-2 text-[11px] text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
          />
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Open this page again"
            onClick={() => onOpenPage(detail.pageUrl)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent/10 px-2 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/20">
            <RefreshCw className="h-3.5 w-3.5" /> Open & re-scan
          </button>
          <button
            type="button"
            aria-label="Delete this entry"
            onClick={() => {
              onRemove(detail.id)
              setOpenId(null)
            }}
            className="rounded-lg border border-line/50 px-2 py-1.5 text-ink-faint hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 px-3 py-2">
        <input
          type="search"
          value={query}
          aria-label="Filter library"
          placeholder="Filter library…"
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line/40 bg-surface-card px-2 py-1.5 text-[11px] text-ink placeholder:text-ink-faint focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        />
        <select
          value={sort}
          aria-label="Sort library"
          onChange={(event) => setSort(event.target.value as LibrarySort)}
          className="hdl-select rounded-lg border border-line/40 bg-surface-card px-2 py-1.5 text-[10px] text-ink">
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hdl-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        {visible.length === 0 ? (
          <p className="mt-8 text-center text-[11px] text-ink-faint">Nothing here yet.</p>
        ) : null}
        {visible.map((entry, index) => {
          const pct =
            entry.totalLinks > 0 ? Math.round((entry.downloadedLinks / entry.totalLinks) * 100) : 0
          return (
            <motion.button
              key={entry.id}
              type="button"
              aria-label={`Open ${entry.title}`}
              onClick={() => setOpenId(entry.id)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              className="flex w-full items-center gap-2 rounded-card border border-line/40 bg-surface-card p-2 text-left transition-colors hover:border-accent/40">
              {entry.coverImage ? (
                <img
                  src={entry.coverImage}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="h-10 w-10 shrink-0 rounded-md bg-gradient-to-br from-accent/25 to-surface-raised" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-semibold text-ink">
                  {entry.title}
                </span>
                <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-surface-raised">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="mt-1 block text-[9.5px] text-ink-faint">
                  {entry.downloadedLinks}/{entry.totalLinks} parts ·{" "}
                  {entry.lastDownloadedAt
                    ? `downloaded ${formatRelativeTime(entry.lastDownloadedAt)}`
                    : `scanned ${formatRelativeTime(entry.scannedAt)}`}
                </span>
              </span>
              <span
                role="button"
                tabIndex={0}
                aria-label={entry.isFavorite ? "Remove favorite" : "Mark favorite"}
                onClick={(event) => {
                  event.stopPropagation()
                  onFavorite(entry.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.stopPropagation()
                    onFavorite(entry.id)
                  }
                }}
                className="rounded p-1">
                <Star
                  className={cn(
                    "h-3.5 w-3.5",
                    entry.isFavorite ? "fill-warn text-warn" : "text-ink-faint"
                  )}
                />
              </span>
            </motion.button>
          )
        })}
      </div>

      {entries.length > 0 ? (
        <div className="shrink-0 border-t border-line/30 px-3 py-1.5">
          <button
            type="button"
            aria-label="Clear all history"
            onClick={() => {
              if (confirmClear) {
                onClearAll()
                setConfirmClear(false)
              } else {
                setConfirmClear(true)
                setTimeout(() => setConfirmClear(false), 4000)
              }
            }}
            className={cn(
              "text-[10px] transition-colors",
              confirmClear ? "font-semibold text-danger" : "text-ink-faint hover:text-danger"
            )}>
            {confirmClear ? "Tap again to confirm" : "Clear all history"}
          </button>
        </div>
      ) : null}
    </div>
  )
}
