'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
  }

  return (
    <md-icon-button onClick={toggle} aria-label="Basculer thème clair / sombre">
      <md-icon>{isDark ? 'light_mode' : 'dark_mode'}</md-icon>
    </md-icon-button>
  )
}
