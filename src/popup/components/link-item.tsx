import { motion } from "framer-motion"
import { Check, Copy, Download, Loader2 } from "lucide-react"
import { useCallback, useState } from "react"

import { cn, LOG_PREFIX } from "~lib/utils"
import type { Link } from "~types"

type ActionState = "idle" | "busy" | "done"

interface LinkItemProps {
  link: Link
  index: number
  isDownloaded: boolean
  onToggle: (linkId: string) => void
  onDownload: (link: Link) => Promise<boolean>
}

export function LinkItem({ link, index, isDownloaded, onToggle, onDownload }: LinkItemProps) {
  const [copyState, setCopyState] = useState<ActionState>("idle")
  const [dlState, setDlState] = useState<ActionState>("idle")

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link.url)
      setCopyState("done")
      setTimeout(() => setCopyState("idle"), 2000)
    } catch (error) {
      console.warn(`${LOG_PREFIX} Clipboard write failed.`, error)
    }
  }, [link.url])

  const handleDownload = useCallback(async () => {
    if (dlState === "busy") return
    setDlState("busy")
    const ok = await onDownload(link)
    setDlState(ok ? "done" : "idle")
    if (ok) setTimeout(() => setDlState("idle"), 3000)
  }, [dlState, link, onDownload])

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: link.isSelected ? 1 : 0.6, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.18 }}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:!opacity-100",
        link.isSelected ? "bg-accent/[0.04]" : "hover:bg-surface-raised"
      )}>
      <input
        type="checkbox"
        className="hdl-check"
        checked={link.isSelected}
        aria-label={`Select ${link.text}`}
        onChange={() => onToggle(link.id)}
      />

      {link.partNumber ? (
        <span className="shrink-0 rounded border border-accent/25 bg-accent/10 px-1 py-px font-mono text-[9px] text-accent">
          {link.partNumber}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <p
          title={link.url}
          className="truncate text-[13px] font-medium text-ink transition-colors group-hover:text-accent">
          {link.text}
        </p>
        <p className="truncate font-mono text-[10px] text-ink-faint">
          {link.host}
          {link.fileSize ? ` · ${link.fileSize}` : ""}
          {isDownloaded ? " · downloaded" : ""}
        </p>
      </div>

      <button
        type="button"
        aria-label={`Copy link for ${link.text}`}
        onClick={handleCopy}
        className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
        {copyState === "done" ? (
          <Check className="h-3.5 w-3.5 text-accent" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      <motion.button
        type="button"
        aria-label={`Send ${link.text} to your download manager`}
        onClick={handleDownload}
        disabled={dlState === "busy"}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
          dlState === "done"
            ? "bg-accent/20 text-accent"
            : "bg-accent/10 text-accent hover:bg-accent/20"
        )}>
        {dlState === "busy" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : dlState === "done" ? (
          <Check className="h-3 w-3" />
        ) : (
          <Download className="h-3 w-3" />
        )}
        {dlState === "done" ? "Done" : "DL"}
      </motion.button>
    </motion.li>
  )
}
