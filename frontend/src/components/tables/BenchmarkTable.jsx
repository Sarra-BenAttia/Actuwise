/**
 * ACTUWISE — src/components/tables/BenchmarkTable.jsx
 * Tableau de benchmark des modèles ML.
 *
 * Affiche : GLM vs XGBoost vs CANN avec métriques RMSE, Gini, AUC, MAE.
 * Met en évidence (surligne) le modèle retenu automatiquement.
 */

import React from 'react'

/**
 * @param {Array}   rows         - Données du benchmark (tableau de dicts)
 * @param {string}  modeleRetenu - Nom du modèle retenu (pour surlignage)
 * @param {boolean} loading      - État de chargement
 */
function BenchmarkTable({ rows = [], modeleRetenu = null, loading = false }) {
  if (loading) {
    return <TableSkeleton rows={5} cols={5} />
  }

  if (!rows || rows.length === 0) {
    return (
      <div style={styles.empty}>
        <span>📊</span>
        <p>Données de benchmark non disponibles</p>
      </div>
    )
  }

  // Détecter les colonnes automatiquement depuis les données
  const allKeys = Object.keys(rows[0] || {})
  // Colonnes de métriques numériques à afficher
  const metricKeys = allKeys.filter(k =>
    k.toLowerCase().includes('rmse') ||
    k.toLowerCase().includes('gini') ||
    k.toLowerCase().includes('auc') ||
    k.toLowerCase().includes('mae') ||
    k.toLowerCase().includes('mape') ||
    k.toLowerCase().includes('r2')
  )
  // Colonne modèle
  const modelKey = allKeys.find(k =>
    k.toLowerCase().includes('model') ||
    k.toLowerCase().includes('modèle') ||
    k.toLowerCase().includes('methode') ||
    k.toLowerCase().includes('méthode')
  ) || allKeys[0]

  const displayKeys = [modelKey, ...metricKeys]

  // Labels lisibles pour les colonnes métriques
  const headerLabel = (key) => {
    const labels = {
      rmse: 'RMSE', gini: 'Gini', auc: 'AUC-ROC', mae: 'MAE',
      mape: 'MAPE (%)', r2: 'R²',
    }
    const lk = key.toLowerCase()
    for (const [k, v] of Object.entries(labels)) {
      if (lk.includes(k)) return v
    }
    return key.replace(/_/g, ' ').toUpperCase()
  }

  const isRetenu = (row) => {
    if (!modeleRetenu) return false
    const val = String(row[modelKey] || '').toLowerCase()
    return val.includes(modeleRetenu.toLowerCase()) ||
      modeleRetenu.toLowerCase().includes(val)
  }

  const formatMetric = (val) => {
    if (val === null || val === undefined) return '—'
    const n = Number(val)
    if (isNaN(n)) return String(val)
    return n < 1 ? n.toFixed(4) : n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            {displayKeys.map(key => (
              <th key={key} style={styles.th}>
                {headerLabel(key)}
              </th>
            ))}
            <th style={styles.th}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const retenu = isRetenu(row)
            return (
              <tr
                key={i}
                style={{
                  ...styles.tr,
                  background: retenu
                    ? 'rgba(59,130,246,0.12)'
                    : i % 2 === 0 ? 'rgba(30,41,59,0.6)' : 'rgba(15,23,42,0.6)',
                  border: retenu ? '1px solid rgba(59,130,246,0.4)' : 'none',
                }}
              >
                {displayKeys.map(key => (
                  <td key={key} style={{
                    ...styles.td,
                    fontWeight: key === modelKey ? 600 : 400,
                    color: retenu && key === modelKey ? '#60a5fa' : '#e2e8f0',
                  }}>
                    {key === modelKey ? row[key] : formatMetric(row[key])}
                  </td>
                ))}
                <td style={styles.td}>
                  {retenu ? (
                    <span style={styles.badgeRetenu}>✅ Retenu</span>
                  ) : (
                    <span style={styles.badgeAutre}>Comparaison</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Skeleton de chargement pour le tableau.
 */
function TableSkeleton({ rows = 4, cols = 5 }) {
  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={styles.th}>
                <div style={styles.skeletonCell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} style={styles.tr}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} style={styles.td}>
                  <div style={{ ...styles.skeletonCell, width: j === 0 ? '80%' : '50%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  wrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.5)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    minWidth: '400px',
  },
  headerRow: {
    background: 'rgba(15,23,42,0.8)',
    borderBottom: '1px solid rgba(51,65,85,0.5)',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tr: {
    transition: 'background 0.15s',
    borderBottom: '1px solid rgba(51,65,85,0.2)',
  },
  td: {
    padding: '11px 16px',
    color: '#e2e8f0',
    fontSize: '13px',
    whiteSpace: 'nowrap',
  },
  badgeRetenu: {
    fontSize: '11px',
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'rgba(34,197,94,0.15)',
    color: '#4ade80',
    border: '1px solid rgba(34,197,94,0.3)',
    fontWeight: 600,
  },
  badgeAutre: {
    fontSize: '11px',
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'rgba(148,163,184,0.1)',
    color: '#64748b',
    border: '1px solid rgba(148,163,184,0.2)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    color: '#475569',
    gap: '8px',
    fontSize: '14px',
  },
  skeletonCell: {
    height: '14px',
    background: 'rgba(51,65,85,0.4)',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
    width: '70%',
  },
}

export default BenchmarkTable
