import { useCallback, useEffect, useState } from "react"

import { DEFAULT_SETTINGS, getSettings, saveSettings } from "~lib/storage"
import { LOG_PREFIX } from "~lib/utils"
import type { Settings } from "~types"

export interface UseSettings {
  settings: Settings
  ready: boolean
  update: (patch: Partial<Settings>) => Promise<void>
}

export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    getSettings()
      .then((loaded) => {
        if (active) setSettings(loaded)
      })
      .catch((error: unknown) => console.error(`${LOG_PREFIX} Settings load failed.`, error))
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      saveSettings(next).catch((error: unknown) =>
        console.error(`${LOG_PREFIX} Settings save failed.`, error)
      )
      return next
    })
  }, [])

  return { settings, ready, update }
}
