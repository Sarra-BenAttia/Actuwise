/**
 * ACTUWISE — src/services/api.js
 * Client Axios centralisé pour tous les appels à l'API FastAPI.
 *
 * Toutes les fonctions retournent { data, error } pour une gestion uniforme.
 * L'URL de base est /api (proxy Vite → http://localhost:8000).
 *
 * Modules actifs    : Stats, Module 1, Module 2, Module 3
 * Modules placeholder : Module 4, Module 6
 */

import axios from 'axios'

// ============================================================
// Instance Axios configurée
// ============================================================
const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 secondes (modèles ML peuvent être lents)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// --- Intercepteur de requête : logs en développement ---
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// --- Intercepteur de réponse : gestion globale des erreurs ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[API] Erreur :', error.response?.status, error.response?.data)
    }
    return Promise.reject(error)
  }
)

// ============================================================
// Utilitaire de wrapping — retourne { data, error }
// ============================================================
const safeCall = async (fn) => {
  try {
    const response = await fn()
    return { data: response.data, error: null }
  } catch (err) {
    const errorMessage =
      err.response?.data?.message ||
      err.response?.data?.detail ||
      err.message ||
      'Erreur de connexion au serveur'
    return { data: null, error: errorMessage }
  }
}

// ============================================================
// HEALTH — Vérification de santé du backend
// ============================================================

/** Vérifie que le backend FastAPI est disponible */
export const checkHealth = () =>
  safeCall(() => api.get('/health'))

// ============================================================
// STATS & KPIs (page d'accueil + vue générale dashboard)
// ============================================================

/** Statistiques globales du portefeuille (page d'accueil) */
export const getStats = () =>
  safeCall(() => api.get('/stats'))

/** 3 métriques phares pour la section "Résultats clés" */
export const getResultatsCles = () =>
  safeCall(() => api.get('/resultats_cles'))

/** 4 KPI cards du dashboard (Vue Générale) */
export const getKPIs = () =>
  safeCall(() => api.get('/kpis'))

// ============================================================
// MODULE 1 — Sinistralité
// ============================================================

/** Toutes les données Module 1 (série mensuelle, par garantie, par année) */
export const getSinistralite = () =>
  safeCall(() => api.get('/sinistralite'))

// ============================================================
// MODULE 2 — Provisionnement
// ============================================================

/** Méthodes classiques : CL, BF, Cape Cod, triangle, stress tests */
export const getProvisionnementClassique = () =>
  safeCall(() => api.get('/provisionnement/classique'))

/** ML Reserving : XGBoost + modèle retenu + benchmark */
export const getProvisionnementML = () =>
  safeCall(() => api.get('/provisionnement/ml'))

/**
 * Prédiction réserves depuis un triangle partiel
 * @param {Object} payload - { triangle_data: number[][], annees_survenance?: number[] }
 */
export const predictReserving = (payload) =>
  safeCall(() => api.post('/predict/reserving', payload))

// ============================================================
// MODULE 3 — Modélisation des risques
// ============================================================

/** Benchmark GLM vs XGBoost vs CANN + modèle retenu + courbe de Lorenz */
export const getModelisationBenchmark = () =>
  safeCall(() => api.get('/modelisation/benchmark'))

/** Valeurs SHAP top 10 + chemins figures */
export const getModelisationSHAP = () =>
  safeCall(() => api.get('/modelisation/shap'))

/** Segmentation : ratio combiné par segment + clusters K-Means */
export const getModelisationSegments = () =>
  safeCall(() => api.get('/modelisation/segments'))

/**
 * Prédiction prime pure pour un profil assuré
 * @param {Object} profil - { age_conducteur, classe_bm, puissance_fiscale, region, usage, energie, anciennete_vehicule }
 */
export const predictAssure = (profil) =>
  safeCall(() => api.post('/predict/assure', profil))

// ============================================================
// MODULE 4 — Séries temporelles (PLACEHOLDER)
// ============================================================

/** Données historiques + décomposition (non implémenté) */
export const getSeriesHistorique = () =>
  safeCall(() => api.get('/series/historique'))

/** Benchmark modèles séries temp. (non implémenté) */
export const getSeriesBenchmark = () =>
  safeCall(() => api.get('/series/benchmark'))

/** Prévisions 2024 avec IC et alertes (non implémenté) */
export const getSeriesPrevisions = () =>
  safeCall(() => api.get('/series/previsions'))

// ============================================================
// RATIO COMBINÉ — Vue consolidée
// ============================================================

/** Vue consolidée ratio combiné : mensuel + annuel + par segment */
export const getRatioCombine = () =>
  safeCall(() => api.get('/ratio_combine'))

// ============================================================
// MODULE 6 — Assistant IA (PLACEHOLDER)
// ============================================================

/**
 * Pose une question à l'assistant IA (non implémenté)
 * @param {string} question - Question en français
 * @param {Array} historique - Historique de la conversation
 */
export const askAssistant = (question, historique = []) =>
  safeCall(() => api.post('/assistant/question', { question, historique }))

// ============================================================
// Utilitaires
// ============================================================

/**
 * Construit l'URL complète d'une figure statique
 * @param {string} figureName - Nom de la figure (ex: "triangle_heatmap.png")
 * @returns {string} URL complète pointant vers le backend
 */
export const getFigureUrl = (figureName) =>
  `http://localhost:8000/figures/${figureName}`

/**
 * Formate un nombre en notation compacte (ex: 94852 → "94 852")
 * @param {number} value
 * @param {number} decimals
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return 'N/A'
  return new Intl.NumberFormat('fr-TN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formate un montant en TND
 * @param {number} value
 */
export const formatTND = (value) => {
  if (value === null || value === undefined) return 'N/A'
  return `${formatNumber(value, 0)} TND`
}

/**
 * Formate un ratio en pourcentage
 * @param {number} value
 */
export const formatPct = (value, decimals = 1) => {
  if (value === null || value === undefined) return 'N/A'
  return `${Number(value).toFixed(decimals)}%`
}

export default api
