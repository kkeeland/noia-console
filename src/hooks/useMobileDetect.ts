import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

interface MobileState {
  isMobile: boolean
  width: number
  height: number
}

/**
 * Detects whether the viewport is mobile-sized (< 768px).
 * Updates on resize via matchMedia for efficiency.
 */
export function useMobileDetect(): MobileState {
  const [state, setState] = useState<MobileState>(() => ({
    isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }))

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const handleChange = () => {
      setState({
        isMobile: window.innerWidth < MOBILE_BREAKPOINT,
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    mql.addEventListener('change', handleChange)
    window.addEventListener('resize', handleChange)

    return () => {
      mql.removeEventListener('change', handleChange)
      window.removeEventListener('resize', handleChange)
    }
  }, [])

  return state
}
