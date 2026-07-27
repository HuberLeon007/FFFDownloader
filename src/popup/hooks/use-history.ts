import { useCallback, useEffect, useState } from "react"

import {
  clearLibrary,
  deleteEntry,
  getLibrary,
  markLinkDownloaded,
  toggleFavorite,
  updateNotes
} from "~lib/storage"
import { LOG_PREFIX } from "~lib/utils"
import type { LibraryEntry } from "~types"

export interface UseHistory {
  entries: LibraryEntry[]
  ready: boolean
  refresh: () => Promise<void>
  markDownloaded: (entryId: string, linkId: string, fileName?: string) => Promise<void>
  favorite: (entryId: string) => Promise<void>
  setNotes: (entryId: string, notes: string) => Promise<void>
  remove: (entryId: string) => Promise<void>
  clearAll: () => Promise<void>
}

export function useHistory(): UseHistory {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setEntries(await getLibrary())
    } catch (error) {
      console.error(`${LOG_PREFIX} Library load failed.`, error)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const wrap = useCallback(
    (op: () => Promise<LibraryEntry[]>) => async () => {
      try {
        setEntries(await op())
      } catch (error) {
        console.error(`${LOG_PREFIX} Library update failed.`, error)
      }
    },
    []
  )

  return {
    entries,
    ready,
    refresh,
    markDownloaded: async (entryId, linkId, fileName) =>
      wrap(() => markLinkDownloaded(entryId, linkId, fileName))(),
    favorite: async (entryId) => wrap(() => toggleFavorite(entryId))(),
    setNotes: async (entryId, notes) => wrap(() => updateNotes(entryId, notes))(),
    remove: async (entryId) => wrap(() => deleteEntry(entryId))(),
    clearAll: async () => wrap(() => clearLibrary())()
  }
}
