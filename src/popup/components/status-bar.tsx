import { motion } from "framer-motion"

import { cn } from "~lib/utils"
import type { ScanStatus } from "~types"

interface StatusBarProps {
  status: ScanStatus
  message: string
}

const DOT: Record<ScanStatus, string> = {
  idle: "bg-ink-faint",
  loading: "bg-warn",
  success: "bg-accent",
  error: "bg-danger"
}

export function StatusBar({ status, message }: StatusBarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-7 shrink-0 items-center gap-2 border-b border-line/30 px-3">
      <motion.span
        animate={
          status === "loading" ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : { scale: 1 }
        }
        transition={{ duration: 1.2, repeat: status === "loading" ? Infinity : 0 }}
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[status])}
      />
      <p className="truncate text-[10.5px] text-ink-muted">{message}</p>
    </div>
  )
}
