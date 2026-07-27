import { AnimatePresence, motion } from "framer-motion"
import { Check, Loader2, RotateCw, Search } from "lucide-react"

import { cn } from "~lib/utils"
import type { ScanStatus } from "~types"

interface ScanButtonProps {
  status: ScanStatus
  onScan: () => void
}

const COPY: Record<ScanStatus, string> = {
  idle: "Scan Page for Links",
  loading: "Scanning…",
  success: "Scan Complete",
  error: "Retry Scan"
}

export function ScanButton({ status, onScan }: ScanButtonProps) {
  const isLoading = status === "loading"

  return (
    <motion.button
      type="button"
      aria-label={COPY[status]}
      disabled={isLoading}
      onClick={onScan}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        status === "error"
          ? "bg-danger/15 text-danger hover:bg-danger/25"
          : "bg-accent text-surface-base hover:bg-accent-dim",
        isLoading && "hdl-pulse-glow cursor-wait bg-accent/40 text-surface-base"
      )}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className="flex items-center">
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === "success" ? (
            <Check className="h-3.5 w-3.5" />
          ) : status === "error" ? (
            <RotateCw className="h-3.5 w-3.5" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </motion.span>
      </AnimatePresence>
      {COPY[status]}
    </motion.button>
  )
}
