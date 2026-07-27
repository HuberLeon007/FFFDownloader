import { motion } from "framer-motion"
import { Settings2, Zap } from "lucide-react"

import { getVersion } from "~lib/messages"
import { cn } from "~lib/utils"

interface HeaderProps {
  settingsOpen: boolean
  onToggleSettings: () => void
}

export function Header({ settingsOpen, onToggleSettings }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-line/40 px-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
          <Zap className="h-4 w-4 text-accent drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        </span>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[13px] font-semibold text-ink">
              Harvest<span className="text-accent">DL</span>
            </h1>
            <span className="rounded-full border border-line/60 px-1.5 py-px text-[9px] font-medium text-ink-faint">
              v{getVersion()}
            </span>
          </div>
          <p className="text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
            Configurable link harvester
          </p>
        </div>
      </div>
      <motion.button
        type="button"
        aria-label={settingsOpen ? "Close settings" : "Open settings"}
        aria-expanded={settingsOpen}
        onClick={onToggleSettings}
        whileHover={{ rotate: 90 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
          settingsOpen && "bg-surface-raised text-accent"
        )}>
        <Settings2 className="h-4 w-4" />
      </motion.button>
    </header>
  )
}
