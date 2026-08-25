import { useEffect, useState } from 'react'

export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf: number
    const start = performance.now()

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setValue(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
