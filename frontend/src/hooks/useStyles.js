import { useEffect } from 'react'

/**
 * Hook personnalisé pour charger dynamiquement des feuilles de style CSS.
 * Permet d'éviter les conflits entre Bootstrap 4 (DeskApp) et Bootstrap 5 (Arsha).
 *
 * @param {Array<string>} hrefs - Liste des chemins de feuilles de style à charger
 */
export function useStyles(hrefs) {
  useEffect(() => {
    const links = hrefs.map(href => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.type = 'text/css'
      link.href = href
      document.head.appendChild(link)
      return link
    })

    // Nettoyage au démontage du composant
    return () => {
      links.forEach(link => {
        if (document.head.contains(link)) {
          document.head.removeChild(link)
        }
      })
    }
  }, [hrefs])
}

/**
 * Hook pour ajouter des classes au body.
 *
 * @param {Array<string>} classes - Liste des classes à ajouter
 */
export function useBodyClass(classes) {
  useEffect(() => {
    classes.forEach(c => document.body.classList.add(c))
    return () => {
      classes.forEach(c => document.body.classList.remove(c))
    }
  }, [classes])
}
