import { motion } from "framer-motion"
import { ArrowUp, Boxes } from "lucide-react"

const STEPS = [
  "Add a site profile in settings",
  "Open a page on that domain",
  "Hit Scan Page above"
]

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="hdl-float flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 shadow-[0_0_28px_rgba(52,211,153,0.18)]">
        <Boxes className="h-7 w-7 text-accent" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-ink">No links harvested yet</h2>
        <p className="mt-1 text-[11px] text-ink-faint">
          HarvestDL only runs on domains you configure.
        </p>
      </div>
      <ol className="w-full space-y-1.5">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-2 rounded-lg border border-line/40 bg-surface-card px-2.5 py-1.5 text-left">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[9px] text-accent">
              {index + 1}
            </span>
            <span className="text-[11px] text-ink-muted">{step}</span>
          </li>
        ))}
      </ol>
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
        <ArrowUp className="h-4 w-4 text-accent/60" />
      </motion.span>
    </div>
  )
}
