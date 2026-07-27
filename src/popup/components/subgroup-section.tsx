import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Copy, Download, ShieldCheck, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { cn } from "~lib/utils"
import { LinkItem } from "~popup/components/link-item"
import type { Link, LinkState, SubGroup } from "~types"

interface SubGroupSectionProps {
  group: SubGroup
  linkStates: Record<string, LinkState>
  onToggleLink: (linkId: string) => void
  onToggleGroup: (groupName: string, selected: boolean) => void
  onDownload: (link: Link) => Promise<boolean>
  onDownloadGroup: (links: Link[]) => void
  onCopyGroup: (links: Link[]) => void
}

export function SubGroupSection({
  group,
  linkStates,
  onToggleLink,
  onToggleGroup,
  onDownload,
  onDownloadGroup,
  onCopyGroup
}: SubGroupSectionProps) {
  const [open, setOpen] = useState(!group.isOptional)
  const checkboxRef = useRef<HTMLInputElement>(null)
  const selected = group.links.filter((link) => link.isSelected).length
  const all = selected === group.links.length && selected > 0
  const partial = selected > 0 && !all

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = partial
  }, [partial])

  return (
    <section className="overflow-hidden rounded-card border border-line/40 bg-surface-card">
      <div
        className="hdl-glass sticky top-0 z-10 flex cursor-pointer items-center gap-2 border-b border-line/30 px-2 py-1.5"
        onClick={() => setOpen((value) => !value)}>
        <input
          ref={checkboxRef}
          type="checkbox"
          className="hdl-check"
          checked={all}
          aria-label={`Select all links in ${group.name}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onToggleGroup(group.name, event.target.checked)}
        />
        {group.isOptional ? (
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-warn" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
        )}
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-bold text-ink">{group.name}</h2>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-px font-mono text-[9px]",
            group.isOptional ? "bg-warn/10 text-warn" : "bg-accent/10 text-accent"
          )}>
          {selected}/{group.links.length}
        </span>
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.18 }}>
          <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}>
            <ul className="space-y-0.5 p-1.5">
              {group.links.map((link, index) => (
                <LinkItem
                  key={link.id}
                  link={link}
                  index={index}
                  isDownloaded={linkStates[link.id]?.downloaded === true}
                  onToggle={onToggleLink}
                  onDownload={onDownload}
                />
              ))}
            </ul>
            <div className="flex items-center justify-end gap-1.5 border-t border-line/30 px-2 py-1.5">
              <button
                type="button"
                aria-label={`Copy all links in ${group.name}`}
                onClick={() => onCopyGroup(group.links)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                <Copy className="h-3 w-3" /> Copy
              </button>
              <button
                type="button"
                aria-label={`Download all links in ${group.name}`}
                onClick={() => onDownloadGroup(group.links)}
                className="flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                <Download className="h-3 w-3" /> Download Group
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
