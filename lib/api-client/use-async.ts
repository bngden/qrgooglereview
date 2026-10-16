'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toUserMessage } from './errors'

type State<T> = {
  data: T | null
  error: string | null
  loading: boolean
}

/** Jalankan async function dengan state loading/error/sukses yang seragam. */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = [],
  immediate = true
): State<T> & { run: () => Promise<T | null>; setData: (v: T | null) => void } {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: immediate })
  const alive = useRef(true)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fnRef.current()
      if (alive.current) setState({ data, error: null, loading: false })
      return data
    } catch (e) {
      if (alive.current) setState((s) => ({ ...s, error: toUserMessage(e), loading: false }))
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps sengaja dari pemanggil
  }, deps)

  useEffect(() => {
    if (immediate) void run()
  }, [immediate, run])

  const setData = useCallback((v: T | null) => setState((s) => ({ ...s, data: v })), [])

  return { ...state, run, setData }
}
