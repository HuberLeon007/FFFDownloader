import { Plus, Trash2 } from "lucide-react"
import { useCallback } from "react"

import { createStarterProfile } from "~lib/storage"
import { uniqueId } from "~lib/utils"
import type { GroupRule, Settings, SiteProfile } from "~types"

interface ProfileEditorProps {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}

function listToText(values: string[]): string {
  return values.join("\n")
}

function textToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

const FIELD_CLASS =
  "w-full rounded-md border border-line/50 bg-surface-base px-2 py-1 font-mono text-[10px] text-ink placeholder:text-ink-faint focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"

export function ProfileEditor({ settings, onChange }: ProfileEditorProps) {
  const patchProfile = useCallback(
    (id: string, patch: Partial<SiteProfile>) => {
      onChange({
        profiles: settings.profiles.map((profile) =>
          profile.id === id ? { ...profile, ...patch } : profile
        )
      })
    },
    [onChange, settings.profiles]
  )

  const patchRule = useCallback(
    (profileId: string, ruleId: string, patch: Partial<GroupRule>) => {
      const profile = settings.profiles.find((item) => item.id === profileId)
      if (!profile) return
      patchProfile(profileId, {
        groupRules: profile.groupRules.map((rule) =>
          rule.id === ruleId ? { ...rule, ...patch } : rule
        )
      })
    },
    [patchProfile, settings.profiles]
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Site profiles
        </p>
        <button
          type="button"
          aria-label="Add a site profile"
          onClick={() => onChange({ profiles: [...settings.profiles, createStarterProfile()] })}
          className="flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          <Plus className="h-3 w-3" /> New
        </button>
      </div>

      {settings.profiles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line/50 px-2 py-3 text-center text-[10px] text-ink-faint">
          No profiles yet. Add one and list the domains you want to harvest.
        </p>
      ) : null}

      {settings.profiles.map((profile) => (
        <details
          key={profile.id}
          className="rounded-lg border border-line/40 bg-surface-card px-2 py-1.5">
          <summary className="flex cursor-pointer list-none items-center gap-2">
            <input
              type="checkbox"
              className="hdl-toggle origin-left scale-[0.62]"
              checked={profile.enabled}
              aria-label={`Enable profile ${profile.name}`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => patchProfile(profile.id, { enabled: event.target.checked })}
            />
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">
              {profile.name}
            </span>
            <span className="font-mono text-[9px] text-ink-faint">
              {profile.matchDomains.length} domain{profile.matchDomains.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              aria-label={`Delete profile ${profile.name}`}
              onClick={(event) => {
                event.preventDefault()
                onChange({
                  profiles: settings.profiles.filter((item) => item.id !== profile.id)
                })
              }}
              className="rounded p-0.5 text-ink-faint hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <Trash2 className="h-3 w-3" />
            </button>
          </summary>

          <div className="mt-2 space-y-2">
            <label className="block">
              <span className="mb-0.5 block text-[9px] uppercase tracking-wide text-ink-faint">
                Name
              </span>
              <input
                type="text"
                value={profile.name}
                onChange={(event) => patchProfile(profile.id, { name: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>

            {(
              [
                ["matchDomains", "Match domains (one per line)"],
                ["includePatterns", "Include patterns (substring or /regex/)"],
                ["excludePatterns", "Exclude patterns"],
                ["contentSelectors", "Content selectors"],
                ["revealSelectors", "Reveal selectors"],
                ["revealKeywords", "Reveal keywords"],
                ["labelStripPrefixes", "Label strip prefixes"]
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-0.5 block text-[9px] uppercase tracking-wide text-ink-faint">
                  {label}
                </span>
                <textarea
                  rows={key === "matchDomains" ? 2 : 3}
                  value={listToText(profile[key])}
                  onChange={(event) =>
                    patchProfile(profile.id, { [key]: textToList(event.target.value) })
                  }
                  className={`${FIELD_CLASS} hdl-scroll resize-y`}
                />
              </label>
            ))}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wide text-ink-faint">
                  Group rules (first match wins)
                </span>
                <button
                  type="button"
                  aria-label="Add group rule"
                  onClick={() =>
                    patchProfile(profile.id, {
                      groupRules: [
                        ...profile.groupRules,
                        {
                          id: uniqueId("rule"),
                          label: "Optional: {clean}",
                          pattern: "optional",
                          isOptional: true
                        }
                      ]
                    })
                  }
                  className="text-[9px] font-semibold text-accent hover:underline">
                  + rule
                </button>
              </div>
              {profile.groupRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-1">
                  <input
                    type="text"
                    aria-label="Rule pattern"
                    value={rule.pattern}
                    placeholder="pattern"
                    onChange={(event) =>
                      patchRule(profile.id, rule.id, { pattern: event.target.value })
                    }
                    className={`${FIELD_CLASS} flex-1`}
                  />
                  <input
                    type="text"
                    aria-label="Rule label"
                    value={rule.label}
                    placeholder="Label {clean}"
                    onChange={(event) =>
                      patchRule(profile.id, rule.id, { label: event.target.value })
                    }
                    className={`${FIELD_CLASS} flex-1`}
                  />
                  <input
                    type="checkbox"
                    className="hdl-check"
                    aria-label="Rule marks content optional"
                    checked={rule.isOptional}
                    onChange={(event) =>
                      patchRule(profile.id, rule.id, { isOptional: event.target.checked })
                    }
                  />
                  <button
                    type="button"
                    aria-label="Delete rule"
                    onClick={() =>
                      patchProfile(profile.id, {
                        groupRules: profile.groupRules.filter((item) => item.id !== rule.id)
                      })
                    }
                    className="rounded p-0.5 text-ink-faint hover:text-danger">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                aria-label="Default group name"
                value={profile.defaultGroupName}
                onChange={(event) =>
                  patchProfile(profile.id, { defaultGroupName: event.target.value })
                }
                className={`${FIELD_CLASS} flex-1`}
              />
              <label className="flex items-center gap-1 text-[9px] text-ink-faint">
                <input
                  type="checkbox"
                  className="hdl-check"
                  checked={profile.defaultGroupOptional}
                  aria-label="Default group is optional"
                  onChange={(event) =>
                    patchProfile(profile.id, { defaultGroupOptional: event.target.checked })
                  }
                />
                optional
              </label>
            </div>
          </div>
        </details>
      ))}
    </div>
  )
}
