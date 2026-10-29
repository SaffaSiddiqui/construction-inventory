import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { dbApi } from '../lib/dbApi'
import { TABLE_ORDER } from '../lib/schema'

const Ctx = createContext(null)
export const useData = () => useContext(Ctx)

const EMPTY = { projects: [], departments: [], products: [], receives: [], issues: [] }

// Loads every record from Supabase. Nothing is typed in by hand.
export function DataProvider({ children }) {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { pathname } = useLocation()

  const reload = useCallback(async () => {
    try {
      const lists = await Promise.all(TABLE_ORDER.map((t) => dbApi.list(t)))
      setData(Object.fromEntries(TABLE_ORDER.map((t, i) => [t, lists[i]])))
      setError('')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [])

  // Fresh data every time the person opens a page
  useEffect(() => {
    reload()
  }, [pathname, reload])

  return <Ctx.Provider value={{ data, loading, error, reload }}>{children}</Ctx.Provider>
}
