/**
 * ACTUWISE — src/components/tables/ReservesTable.jsx
 * Tableau des réserves IBNR par année de survenance.
 *
 * Colonnes : Année, Chain-Ladder, Bornhuetter-Ferguson, Cape Cod, XGBoost, SAP (optionnel).
 * La méthode retenue est mise en évidence avec un fond bleu.
 *
 * Props :
 *   rows          (array)   — Données du tableau (tableau de dicts avec clés : annee, CL, BF, cape_cod, xgboost, sap)
 *   modeleRetenu  (string)  — Nom de la méthode retenue (ex: "CL", "BF", "cape_cod", "xgboost")
 *   loading       (bool)    — État de chargement
 */

import React from 'react'
import { formatNumber } from '../../services/api'

// ============================================================
// Mapping des clés techniques vers labels lisibles
// ============================================================
const COLONNES = [
  { key: 'annee',    label: 'Année',           type: 'year'   },
  { key: 'CL',       label: 'Chain-Ladder',    type: 'number' },
  { key: 'BF',       label: 'Born.-Ferguson',  type: 'number' },
  { key: 'cape_cod', label: 'Cape Cod',        type: 'number' },
  { key: 'xgboost',  label: 'XGBoost',         type: 'number' },
  { key: 'sap',      label: 'SAP',             type: 'number' },
]

/**
 * Composant principal : tableau des réserves
 */
function ReservesTable({ rows = [], modeleRetenu = null, loading = false }) {
  // --- État de chargement ---
  if (loading) {
    return <TableSkeleton rows={6} cols={6} />
  }

  // --- Données vides ---
  if (!rows || rows.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: '28px' }}>📋</span>
        <p>Données de réserves non disponibles</p>
      </div>
    )
  }

  // Filtrer les colonnes présentes dans les données
  const availableKeys = Object.keys(rows[0] || {})
  const colonnesVisibles = COLONNES.filter(col => availableKeys.includes(col.key))

  /**
   * Vérifie si une colonne correspond à la méthode retenue
   */
  const isMethodeRetenue = (colKey) => {
    if (!modeleRetenu) return false
    return colKey.toLowerCase() === modeleRetenu.toLowerCase()
  }

  /**
   * Formate une valeur de réserve en TND lisible
   */
  const formatVal = (val, type) => {
    if (val === null || val === undefined) return '—'
    if (type === 'year') return String(val)
    const n = Number(val)
    if (isNaN(n)) return String(val)
    return formatNumber(n, 0)
  }

  // Calcul des totaux par colonne
  const totaux = {}
  colonnesVisibles.forEach(col => {
    if (col.type === 'number') {
      totaux[col.key] = rows.reduce((sum, row) => {
        const v = Number(row[col.key])
        return sum + (isNaN(v) ? 0 : v)
      }, 0)
    }
  })

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        {/* En-tête */}
        <thead>
          <tr style={styles.headerRow}>
            {colonnesVisibles.map(col => (
              <th
                key={col.key}
                style={{
                  ...styles.th,
                  // Surligner l'en-tête de la méthode retenue
                  color: isMethodeRetenue(col.key) ? '#60a5fa' : '#94a3b8',
                  borderBottom: isMethodeRetenue(col.key) ? '2px solid #3b82f6' : '1px solid rgba(51,65,85,0.5)',
                }}
              >
                {col.label}
                {isMethodeRetenue(col.key) && (
                  <span style={styles.badgeRetenuHeader}> ★</span>
                )}
              </th>
            ))}
          </tr>
        </thead>

        {/* Corps du tableau */}
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.annee || i}
              style={{
                ...styles.tr,
                background: i % 2 === 0 ? 'rgba(30,41,59,0.6)' : 'rgba(15,23,42,0.6)',
              }}
            >
              {colonnesVisibles.map(col => {
                const retenue = isMethodeRetenue(col.key)
                return (
                  <td
                    key={col.key}
                    style={{
                      ...styles.td,
                      fontWeight: col.type === 'year' ? 600 : retenue ? 600 : 400,
                      color: col.type === 'year'
                        ? '#cbd5e1'
                        : retenue ? '#60a5fa' : '#e2e8f0',
                      background: retenue ? 'rgba(59,130,246,0.08)' : 'transparent',
                    }}
                  >
                    {formatVal(row[col.key], col.type)}
                  </td>
                )
              })}
            </tr>
          ))}

          {/* Ligne de total */}
          <tr style={styles.totalRow}>
            {colonnesVisibles.map(col => {
              const retenue = isMethodeRetenue(col.key)
              return (
                <td
                  key={col.key}
                  style={{
                    ...styles.td,
                    fontWeight: 700,
                    color: col.type === 'year'
                      ? '#94a3b8'
                      : retenue ? '#3b82f6' : '#e2e8f0',
                    background: retenue ? 'rgba(59,130,246,0.12)' : 'transparent',
                    borderTop: '2px solid rgba(51,65,85,0.5)',
                    fontSize: '14px',
                  }}
                >
                  {col.type === 'year' ? 'TOTAL' : formatVal(totaux[col.key], 'number')}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>

      {/* Légende en bas */}
      {modeleRetenu && (
        <div style={styles.legende}>
          <span style={styles.badgeRetenu}>★ Méthode retenue : {modeleRetenu.toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton de chargement pour le tableau
 */
function TableSkeleton({ rows = 6, cols = 6 }) {
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
                  <div style={{ ...styles.skeletonCell, width: j === 0 ? '50%' : '70%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Styles inline (cohérents avec BenchmarkTable)
// ============================================================
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
    minWidth: '500px',
  },
  headerRow: {
    background: 'rgba(15,23,42,0.8)',
    borderBottom: '1px solid rgba(51,65,85,0.5)',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'right',
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
  totalRow: {
    background: 'rgba(15,23,42,0.9)',
    borderTop: '2px solid rgba(51,65,85,0.6)',
  },
  td: {
    padding: '11px 16px',
    color: '#e2e8f0',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  badgeRetenuHeader: {
    color: '#3b82f6',
    fontSize: '14px',
  },
  badgeRetenu: {
    fontSize: '11px',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.3)',
    fontWeight: 600,
  },
  legende: {
    padding: '10px 16px',
    background: 'rgba(15,23,42,0.4)',
    borderTop: '1px solid rgba(51,65,85,0.3)',
    display: 'flex',
    justifyContent: 'flex-end',
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

export default ReservesTable
