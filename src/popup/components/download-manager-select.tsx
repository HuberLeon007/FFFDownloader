import { Loader2 } from "lucide-react"
import { useCallback, useState } from "react"

import { ACTIONS, sendToBackground } from "~lib/messages"
import { cn } from "~lib/utils"
import type {
  DownloadManagerConfig,
  DownloadManagerType,
  Settings,
  TestConnectionResponse
} from "~types"

interface DownloadManagerSelectProps {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}

type Health = "unknown" | "ok" | "fail" | "testing"

const DESCRIPTIONS: Record<DownloadManagerType, string> = {
  "browser-native": "Uses the browser download API. IDM, AB Download Manager, etc. hook in.",
  jdownloader2: "Posts to the FlashGot endpoint. Falls back to the browser if offline.",
  aria2: "JSON-RPC addUri. Optional secret token supported.",
  custom: "Any GET endpoint. Use {url} and {filename} placeholders."
}

export function DownloadManagerSelect({ settings, onChange }: DownloadManagerSelectProps) {
  const [health, setHealth] = useState<Record<string, Health>>({})

  const patchManager = useCallback(
    (type: DownloadManagerType, patch: Partial<DownloadManagerConfig>) => {
      onChange({
        downloadManagers: settings.downloadManagers.map((manager) =>
          manager.type === type ? { ...manager, ...patch } : manager
        )
      })
    },
    [onChange, settings.downloadManagers]
  )

  const test = useCallback(async (type: DownloadManagerType) => {
    setHealth((current) => ({ ...current, [type]: "testing" }))
    try {
      const response = await sendToBackground<TestConnectionResponse>({
        action: ACTIONS.TEST_CONNECTION,
        payload: { type }
      })
      setHealth((current) => ({ ...current, [type]: response.success ? "ok" : "fail" }))
    } catch {
      setHealth((current) => ({ ...current, [type]: "fail" }))
    }
  }, [])

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
        Download manager
      </p>
      {settings.downloadManagers.map((manager) => {
        const active = settings.downloadManager === manager.type
        const state = health[manager.type] ?? "unknown"
        return (
          <div
            key={manager.type}
            className={cn(
              "rounded-lg border p-2 transition-colors",
              active ? "border-accent/50 bg-accent/[0.05]" : "border-line/40 bg-surface-card"
            )}>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="hdl-manager"
                className="hdl-check mt-0.5 !rounded-full"
                checked={active}
                aria-label={manager.label}
                onChange={() => onChange({ downloadManager: manager.type })}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-ink">{manager.label}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      state === "ok"
                        ? "bg-accent"
                        : state === "fail"
                          ? "bg-danger"
                          : "bg-ink-faint/50"
                    )}
                  />
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-ink-faint">
                  {DESCRIPTIONS[manager.type]}
                </span>
              </span>
            </label>

            {active && manager.type !== "browser-native" ? (
              <div className="mt-2 space-y-1.5 pl-6">
                {manager.type === "custom" ? (
                  <input
                    type="text"
                    aria-label="Custom endpoint template"
                    value={manager.template ?? ""}
                    placeholder="http://host/add?url={url}&name={filename}"
                    onChange={(event) =>
                      patchManager(manager.type, { template: event.target.value })
                    }
                    className="w-full rounded-md border border-line/50 bg-surface-base px-2 py-1 font-mono text-[10px] text-ink placeholder:text-ink-faint focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                  />
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      aria-label="Host"
                      value={manager.host ?? ""}
                      placeholder="127.0.0.1"
                      onChange={(event) =>
                        patchManager(manager.type, { host: event.target.value })
                      }
                      className="min-w-0 flex-1 rounded-md border border-line/50 bg-surface-base px-2 py-1 font-mono text-[10px] text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                    />
                    <input
                      type="number"
                      aria-label="Port"
                      value={manager.port ?? 0}
                      onChange={(event) =>
                        patchManager(manager.type, { port: Number(event.target.value) })
                      }
                      className="w-16 rounded-md border border-line/50 bg-surface-base px-2 py-1 font-mono text-[10px] text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                    />
                  </div>
                )}
                {manager.type === "aria2" ? (
                  <input
                    type="password"
                    aria-label="aria2 secret token"
                    value={manager.secret ?? ""}
                    placeholder="secret token (optional)"
                    onChange={(event) =>
                      patchManager(manager.type, { secret: event.target.value })
                    }
                    className="w-full rounded-md border border-line/50 bg-surface-base px-2 py-1 font-mono text-[10px] text-ink placeholder:text-ink-faint focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                  />
                ) : null}
                <button
                  type="button"
                  aria-label={`Test connection to ${manager.label}`}
                  onClick={() => void test(manager.type)}
                  className="flex items-center gap-1 rounded-md bg-surface-raised px-2 py-1 text-[10px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                  {state === "testing" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Test connection
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
