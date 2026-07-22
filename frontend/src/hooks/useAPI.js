/**
 * ACTUWISE — src/hooks/useAPI.js
 * Hook générique pour les appels API avec gestion loading / error / data.
 *
 * Usage :
 *   const { data, loading, error, refetch } = useAPI(getKPIs)
 *   const { data, loading, error, refetch } = useAPI(getKPIs, [], { immediate: false })
 *
 * Options :
 *   immediate (bool, défaut: true)  → déclenche l'appel au mount
 *   params    (array, défaut: [])   → arguments passés à la fonction API
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'

/**
 * Hook principal pour les appels GET (chargement automatique au mount).
 *
 * @param {Function} apiFn    - Fonction de src/services/api.js à appeler
 * @param {Array}    deps     - Dépendances pour re-déclencher l'appel (comme useEffect)
 * @param {Object}   options  - { immediate: bool, showErrorToast: bool, params: any[] }
 */
export function useAPI(apiFn, deps = [], options = {}) {
  const {
    immediate = true,
    showErrorToast = false,
    params = [],
  } = options

  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null,
  })

  // Référence stable pour éviter les re-renders infinis
  const apiFnRef = useRef(apiFn)
  apiFnRef.current = apiFn

  const fetchData = useCallback(async (...callParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const args = callParams.length > 0 ? callParams : params
    const { data, error } = await apiFnRef.current(...args)

    if (error) {
      setState({ data: null, loading: false, error })
      if (showErrorToast) {
        toast.error(`Erreur API : ${error}`)
      }
    } else {
      setState({ data, loading: false, error: null })
    }

    return { data, error }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) {
      fetchData(...params)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    refetch: fetchData,
  }
}

/**
 * Hook pour les appels POST (actions manuelles — formulaires).
 * Ne se déclenche PAS automatiquement, uniquement via execute().
 *
 * @param {Function} apiFn - Fonction POST de src/services/api.js
 *
 * Usage :
 *   const { execute, data, loading, error } = usePost(predictAssure)
 *   // Dans le handler :
 *   const result = await execute({ age_conducteur: 35, ... })
 */
export function usePost(apiFn) {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (payload) => {
    setState({ data: null, loading: true, error: null })

    const { data, error } = await apiFn(payload)

    if (error) {
      setState({ data: null, loading: false, error })
      toast.error(`Erreur : ${error}`)
    } else {
      setState({ data, loading: false, error: null })
    }

    return { data, error }
  }, [apiFn])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}

/**
 * Hook pour une série d'appels API lancés en parallèle.
 * Utile pour charger plusieurs endpoints simultanément (ex: dashboard).
 *
 * @param {Array<{key: string, fn: Function, params?: any[]}>} calls
 * @param {Array} deps
 *
 * Usage :
 *   const { results, loading, errors } = useMultiAPI([
 *     { key: 'kpis', fn: getKPIs },
 *     { key: 'sinistralite', fn: getSinistralite },
 *   ])
 *   results.kpis.data, results.sinistralite.loading, etc.
 */
export function useMultiAPI(calls, deps = []) {
  const [results, setResults] = useState(
    () => Object.fromEntries(calls.map(c => [c.key, { data: null, loading: true, error: null }]))
  )

  const fetchAll = useCallback(async () => {
    // Initialiser tous en loading
    setResults(
      Object.fromEntries(calls.map(c => [c.key, { data: null, loading: true, error: null }]))
    )

    // Lancer tous les appels en parallèle
    const settled = await Promise.allSettled(
      calls.map(c => (c.params ? c.fn(...c.params) : c.fn()))
    )

    const newResults = {}
    calls.forEach((c, i) => {
      const result = settled[i]
      if (result.status === 'fulfilled') {
        const { data, error } = result.value
        newResults[c.key] = { data, loading: false, error }
      } else {
        newResults[c.key] = {
          data: null,
          loading: false,
          error: result.reason?.message || 'Erreur inconnue'
        }
      }
    })

    setResults(newResults)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  // Méta-états globaux
  const loading = Object.values(results).some(r => r.loading)
  const errors = Object.fromEntries(
    Object.entries(results).filter(([, r]) => r.error).map(([k, r]) => [k, r.error])
  )
  const hasErrors = Object.keys(errors).length > 0

  return { results, loading, errors, hasErrors, refetch: fetchAll }
}

/**
 * Hook utilitaire pour extraire les données imbriquées de la réponse API ACTUWISE.
 * Toutes les réponses ont le format : { status, data: { ... } }
 *
 * @param {Object|null} apiResponse - Réponse brute de l'API
 * @param {string}      key         - Clé dans response.data
 * @param {*}           fallback    - Valeur par défaut si manquant
 */
export function useExtract(apiResponse, key = null, fallback = null) {
  if (!apiResponse) return fallback
  if (apiResponse.status === 'not_implemented') return fallback
  if (!apiResponse.data) return fallback
  if (key === null) return apiResponse.data
  return apiResponse.data[key] ?? fallback
}

export default useAPI
