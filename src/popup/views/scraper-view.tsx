import { AnimatePresence, motion } from "framer-motion"
import { Copy, Download, Search, X } from "lucide-react"
import { useMemo } from "react"

import { buildSubGroups } from "~lib/link-parser"
import { EmptyState } from "~popup/components/empty-state"
import { ScanButton } from "~popup/components/scan-button"
import { StatusBar } from "~popup/components/status-bar"
import { SubGroupSection } from "~popup/components/subgroup-section"
import type { Link, LinkState, ScanStatus } from "~types"

interface ScraperViewProps {
  status: ScanStatus
  statusMessage: string
  links: Link[]
  linkStates: Record<string, LinkState>
  query: string
  hasScanned: boolean
  batchCopied: boolean
  onQueryChange: (value: string) => void
  onScan: () => void
  onToggleLink: (linkId: string) => void
  onToggleGroup: (groupName: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onDownload: (link: Link) => Promise<boolean>
  onDownloadMany: (links: Link[]) => void
  onCopyMany: (links: Link[]) => void
}

export function ScraperView({
  status,
  statusMessage,
  links,
  linkStates,
  query,
  hasScanned,
  batchCopied,
  onQueryChange,
  onScan,
  onToggleLink,
  onToggleGroup,
  onSelectAll,
  onDownload,
  onDownloadMany,
  onCopyMany
}: ScraperViewProps) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return links
    return links.filter((link) =>
      `${link.text} ${link.host} ${link.subGroup} ${link.url}`.toLowerCase().includes(needle)
    )
  }, [links, query])

  const groups = useMemo(() => buildSubGroups(filtered), [filtered])
  const selected = useMemo(() => links.filter((link) => link.isSelected), [links])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-1.5 px-3 py-2">
        <ScanButton status={status} onScan={onScan} />
        {hasScanned ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              type="search"
              value={query}
              aria-label="Filter harvested links"
              placeholder="Filter files, parts or languages…"
              onChange={(event) => onQueryChange(event.target.value)}
              className="hdl-scroll w-full rounded-lg border border-line/40 bg-surface-card py-1.5 pl-7 pr-7 text-[11px] text-ink placeholder:text-ink-faint focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => onQueryChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint hover:text-ink">
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <StatusBar status={status} message={statusMessage} />

      <div className="hdl-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {links.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2 pb-16">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] text-ink-faint">
                Selected <span className="font-semibold text-accent">{selected.length}</span> /{" "}
                {links.length} links
              </p>
              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  aria-label="Select all links"
                  onClick={() => onSelectAll(true)}
                  className="text-ink-muted hover:text-accent">
                  Select All
                </button>
                <span className="text-ink-faint">·</span>
                <button
                  type="button"
                  aria-label="Deselect all links"
                  onClick={() => onSelectAll(false)}
                  className="text-ink-muted hover:text-accent">
                  Deselect All
                </button>
              </div>
            </div>

            {groups.map((group) => (
              <SubGroupSection
                key={group.name}
                group={group}
                linkStates={linkStates}
                onToggleLink={onToggleLink}
                onToggleGroup={onToggleGroup}
                onDownload={onDownload}
                onDownloadGroup={onDownloadMany}
                onCopyGroup={onCopyMany}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected.length > 0 ? (
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="hdl-glass absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-line/40 px-3 py-2">
            <button
              type="button"
              aria-label={`Copy ${selected.length} selected links`}
              onClick={() => onCopyMany(selected)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line/50 px-3 text-[11px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <Copy className="h-3.5 w-3.5" />
              {batchCopied ? "Copied!" : `Copy (${selected.length})`}
            </button>
            <motion.button
              type="button"
              aria-label={`Download ${selected.length} selected files`}
              onClick={() => onDownloadMany(selected)}
              whileTap={{ scale: 0.97 }}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-[11px] font-semibold text-surface-base transition-colors hover:bg-accent-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <Download className="h-3.5 w-3.5" />
              Download {selected.length} File{selected.length === 1 ? "" : "s"}
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
