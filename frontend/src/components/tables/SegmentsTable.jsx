/**
 * ACTUWISE — src/components/tables/SegmentsTable.jsx
 * Tableau du ratio combiné par segment (Usage × Énergie).
 *
 * Affiche chaque segment avec un badge coloré :
 *   - Rouge  si ratio > 100%  (segment déficitaire)
 *   - Orange si ratio 95-100% (segment à surveiller)
 *   - Vert   si ratio < 95%   (segment rentable)
 *
 * Les lignes sont triées par ratio décroissant (pires segments en premier).
 *
 * Props :
 *   rows    (array)  — Tableau de dicts { segment, usage, energie, ratio, nb_contrats, sinistralite, ... }
 *   loading (bool)   — État de chargement
 */

import React, { useMemo } from 'react'
import { formatPct, formatNumber } from '../../services/api'

/**
 * Retourne la couleur et le label du badge selon la valeur du ratio
 */
function getBadgeStyle(ratio) {
  if (ratio === null || ratio === undefined) {
    return { bg: 'rgba(148,163,184,0.1)', color: '#64748b', border: 'rgba(148,163,184,0.2)', label: 'N/A' }
  }
  if (ratio > 100) {
    return {
      bg: 'rgba(239,68,68,0.15)',
      color: '#f87171',
      border: 'rgba(239,68,68,0.3)',
      label: '⚠ Déficitaire',
    }
  }
  if (ratio >= 95) {
    return {
      bg: 'rgba(249,115,22,0.15)',
      color: '#fb923c',
      border: 'rgba(249,115,22,0.3)',
      label: '⚡ À surveiller',
    }
  }
  return {
    bg: 'rgba(34,197,94,0.15)',
    color: '#4ade80',
    border: 'rgba(34,197,94,0.3)',
    label: '✅ Rentable',
  }
}

/**
 * Composant principal : tableau des segments
 */
function SegmentsTable({ rows = [], loading = false }) {
  // --- État de chargement ---
  if (loading) {
    return <TableSkeleton rows={8} cols={5} />
  }

  // --- Données vides ---
  if (!rows || rows.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: '28px' }}>🔍</span>
        <p>Données de segmentation non disponibles</p>
      </div>
    )
  }

  // Tri décroissant par ratio combiné
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ra = Number(a.ratio ?? a.ratio_combine ?? 0)
      const rb = Number(b.ratio ?? b.ratio_combine ?? 0)
      return rb - ra
    })
  }, [rows])

  // Détecter les clés disponibles pour les colonnes optionnelles
  const sampleRow = rows[0] || {}
  const hasUsage = 'usage' in sampleRow
  const hasEnergie = 'energie' in sampleRow
  const hasNbContrats = 'nb_contrats' in sampleRow
  const hasSinistralite = 'sinistralite' in sampleRow || 'ratio_sinistres' in sampleRow

  /**
   * Extrait la valeur du ratio depuis la ligne (flexible sur le nom de clé)
   */
  const getRatio = (row) => {
    return Number(row.ratio ?? row.ratio_combine ?? row.combined_ratio ?? 0)
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        {/* En-tête */}
        <thead>
          <tr style={styles.headerRow}>
            <th style={{ ...styles.th, textAlign: 'left' }}>Segment</th>
            {hasUsage && <th style={styles.th}>Usage</th>}
            {hasEnergie && <th style={styles.th}>Énergie</th>}
            {hasNbContrats && <th style={styles.th}>Contrats</th>}
            {hasSinistralite && <th style={styles.th}>S/P</th>}
            <th style={styles.th}>Ratio Combiné</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Statut</th>
          </tr>
        </thead>

        {/* Corps */}
        <tbody>
          {sortedRows.map((row, i) => {
            const ratio = getRatio(row)
            const badge = getBadgeStyle(ratio)
            const nomSegment = row.segment || row.nom || `${row.usage || ''} × ${row.energie || ''}`.trim() || `Segment ${i + 1}`

            return (
              <tr
                key={i}
                style={{
                  ...styles.tr,
                  background: ratio > 100
                    ? 'rgba(239,68,68,0.04)'
                    : i % 2 === 0 ? 'rgba(30,41,59,0.6)' : 'rgba(15,23,42,0.6)',
                }}
              >
                {/* Nom du segment */}
                <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600 }}>
                  {nomSegment}
                </td>

                {/* Usage (optionnel) */}
                {hasUsage && (
                  <td style={styles.td}>{row.usage || '—'}</td>
                )}

                {/* Énergie (optionnel) */}
                {hasEnergie && (
                  <td style={styles.td}>{row.energie || '—'}</td>
                )}

                {/* Nombre de contrats (optionnel) */}
                {hasNbContrats && (
                  <td style={styles.td}>{formatNumber(row.nb_contrats)}</td>
                )}

                {/* Sinistralité / S/P (optionnel) */}
                {hasSinistralite && (
                  <td style={styles.td}>
                    {formatPct(row.sinistralite ?? row.ratio_sinistres)}
                  </td>
                )}

                {/* Ratio combiné */}
                <td style={{
                  ...styles.td,
                  fontWeight: 700,
                  fontSize: '14px',
                  color: badge.color,
                }}>
                  {formatPct(ratio)}
                </td>

                {/* Badge statut */}
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {badge.label}
                  </span>
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
 * Skeleton de chargement pour le tableau
 */
function TableSkeleton({ rows = 8, cols = 5 }) {
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
  td: {
    padding: '11px 16px',
    color: '#e2e8f0',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
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

export default SegmentsTable
