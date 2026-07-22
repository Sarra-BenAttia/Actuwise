'use client'

import { useEffect } from 'react'

export function MaterialWebLoader() {
  useEffect(() => {
    import('@material/web/all.js')
    import('@material/web/labs/card/elevated-card.js')
    import('@material/web/labs/card/filled-card.js')
    import('@material/web/labs/card/outlined-card.js')
    import('@material/web/labs/navigationdrawer/navigation-drawer.js')
    import('@material/web/labs/badge/badge.js')
  }, [])

  return null
}
