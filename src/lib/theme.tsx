/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Palette = {
  iris: string
  violet: string
  lilac: string
  magenta: string
  pink: string
  rose: string
  cyan: string
  aqua: string
  amber: string
}

export const ACCENTS: Record<
  string,
  { label: string; colors: Palette; gradDark: [number, number, number] }
> = {
  aurora: {
    label: 'Aurora',
    colors: {
      iris: '#7c5cff',
      violet: '#8b6cff',
      lilac: '#b9a6ff',
      magenta: '#e84cff',
      pink: '#ff6ab5',
      rose: '#ff5d7e',
      cyan: '#45e6d8',
      aqua: '#5ad1ff',
      amber: '#ffc06b',
    },
    gradDark: [8, 20, 24],
  },
  sunset: {
    label: 'Sunset',
    colors: {
      iris: '#ff7a5c',
      violet: '#ff6b6b',
      lilac: '#ffc9a3',
      magenta: '#ff5c8a',
      pink: '#ff8fb0',
      rose: '#ff5d7e',
      cyan: '#ffb454',
      aqua: '#ffd08a',
      amber: '#ffcf6b',
    },
    gradDark: [24, 22, 32],
  },
  ocean: {
    label: 'Ocean',
    colors: {
      iris: '#4f7cff',
      violet: '#5a8cff',
      lilac: '#9cc4ff',
      magenta: '#22b8ff',
      pink: '#38bdf8',
      rose: '#5aa9ff',
      cyan: '#2dd4bf',
      aqua: '#34e1d5',
      amber: '#7dd3fc',
    },
    gradDark: [14, 30, 30],
  },
  bloom: {
    label: 'Bloom',
    colors: {
      iris: '#d040ef',
      violet: '#e879f9',
      lilac: '#f0abfc',
      magenta: '#ec4899',
      pink: '#f472b6',
      rose: '#fb7185',
      cyan: '#c084fc',
      aqua: '#e0aaff',
      amber: '#f9a8d4',
    },
    gradDark: [14, 16, 24],
  },
}

const ACCENT_KEY = 'aurora:accent'
const MOTION_KEY = 'aurora:reduce-motion'

type ThemeCtx = {
  accent: string
  setAccent: (key: string) => void
  reduceMotion: boolean
  setReduceMotion: (value: boolean) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}

/** Applies the selected accent (by overriding the aurora CSS variables) and motion preference. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccent] = useState<string>(() => {
    try {
      return localStorage.getItem(ACCENT_KEY) || 'aurora'
    } catch {
      return 'aurora'
    }
  })
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MOTION_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const preset = ACCENTS[accent] ?? ACCENTS.aurora
    const root = document.documentElement
    for (const [name, value] of Object.entries(preset.colors)) {
      root.style.setProperty(`--color-${name}`, value)
    }
    // Per-accent darkening of the brand-gradient stops so white button labels keep
    // WCAG-AA contrast on every palette (the lighter presets need more darkening).
    preset.gradDark.forEach((pct, i) => root.style.setProperty(`--grad-dark-${i + 1}`, `${pct}%`))
    try {
      localStorage.setItem(ACCENT_KEY, accent)
    } catch {
      /* ignore */
    }
  }, [accent])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    try {
      localStorage.setItem(MOTION_KEY, reduceMotion ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [reduceMotion])

  return <Ctx.Provider value={{ accent, setAccent, reduceMotion, setReduceMotion }}>{children}</Ctx.Provider>
}
