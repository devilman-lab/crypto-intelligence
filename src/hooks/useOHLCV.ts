import { useEffect, useRef, useState } from 'react'
import type { OHLCVResult, Timeframe } from '@shared/types'
import { api, errorMessage } from '@/lib/api'
import { TIMEFRAME_SECONDS } from '@shared/types'

interface State {
  data: OHLCVResult | null
  loading: boolean
  error: string | null
}

/**
 * Loads candles for an asset/timeframe and keeps them fresh: re-fetches
 * every candle interval (capped between 15s and 5min). The main process
 * caches, so frequent calls are cheap.
 */
export function useOHLCV(assetId: string | null, timeframe: Timeframe, limit = 500): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })
  const gen = useRef(0)

  useEffect(() => {
    if (!assetId) return
    const myGen = ++gen.current
    setState((s) => ({ ...s, loading: true, error: null }))

    const load = async () => {
      try {
        const data = await api.market.getOHLCV(assetId, timeframe, limit)
        if (gen.current === myGen) setState({ data, loading: false, error: null })
      } catch (err) {
        if (gen.current === myGen) setState((s) => ({ data: s.data, loading: false, error: errorMessage(err) }))
      }
    }
    void load()
    const every = Math.min(300_000, Math.max(15_000, TIMEFRAME_SECONDS[timeframe] * 1000))
    const id = setInterval(() => void load(), every)
    return () => clearInterval(id)
  }, [assetId, timeframe, limit])

  return state
}
