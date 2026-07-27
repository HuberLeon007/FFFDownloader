import { AnimatePresence, motion } from "framer-motion"

import { DownloadManagerSelect } from "~popup/components/download-manager-select"
import { ProfileEditor } from "~popup/components/profile-editor"
import type { Settings } from "~types"

interface SettingsPanelProps {
  open: boolean
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}

const DELAYS = [500, 1000, 2000, 3000]

export function SettingsPanel({ open, settings, onChange }: SettingsPanelProps) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="shrink-0 overflow-hidden border-b border-line/40 bg-surface-card/60">
          <div className="hdl-scroll max-h-[340px] space-y-3 overflow-y-auto p-3">
            <label className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink-muted">Auto-scan on open</span>
              <input
                type="checkbox"
                className="hdl-toggle"
                checked={settings.autoScan}
                aria-label="Auto-scan on popup open"
                onChange={(event) => onChange({ autoScan: event.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink-muted">Confirm before download</span>
              <input
                type="checkbox"
                className="hdl-toggle"
                checked={settings.confirmBeforeDownload}
                aria-label="Confirm before triggering downloads"
                onChange={(event) => onChange({ confirmBeforeDownload: event.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink-muted">Group by subgroup</span>
              <input
                type="checkbox"
                className="hdl-toggle"
                checked={settings.groupBySubgroup}
                aria-label="Group links into accordion sections"
                onChange={(event) => onChange({ groupBySubgroup: event.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink-muted">Delay between downloads</span>
              <select
                className="hdl-select rounded-md border border-line/50 bg-surface-base px-2 py-1 text-[10px] text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                value={settings.downloadDelay}
                aria-label="Delay between sequential downloads"
                onChange={(event) => onChange({ downloadDelay: Number(event.target.value) })}>
                {DELAYS.map((value) => (
                  <option key={value} value={value}>
                    {value} ms
                  </option>
                ))}
              </select>
            </label>

            <DownloadManagerSelect settings={settings} onChange={onChange} />
            <ProfileEditor settings={settings} onChange={onChange} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
