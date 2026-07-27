import { useState, useEffect, useCallback } from 'react'

interface PlanLimitData {
  feature: string
  limit: number
  pages?: number
}

export function usePlanLimit() {
  const [limitData, setLimitData] = useState<PlanLimitData | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setLimitData(detail?.data || null)
    }
    window.addEventListener('plan-limit', handler)
    return () => window.removeEventListener('plan-limit', handler)
  }, [])

  const dismiss = useCallback(() => setLimitData(null), [])

  return { limitData, dismiss }
}
