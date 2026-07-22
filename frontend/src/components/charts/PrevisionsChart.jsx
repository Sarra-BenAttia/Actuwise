/**
 * ACTUWISE — src/components/charts/PrevisionsChart.jsx
 * Graphique de prévisions séries temporelles — Module 4 PLACEHOLDER.
 *
 * Fonctionnalité prévue (quand le module sera implémenté) :
 *   - AreaChart Recharts
 *   - Historique : ligne pleine bleue
 *   - Prévision  : ligne pointillée orange
 *   - IC 80%     : zone ombrée orange clair
 *   - IC 95%     : zone ombrée orange très clair
 *   - ReferenceLine à 100%
 *
 * Pour le moment, affiche un message "Prochainement".
 *
 * Props :
 *   historique  (array)  — [{ date: "2022-01", valeur: 95.2 }, ...] (futur)
 *   previsions  (array)  — [{ date: "2024-01", prevu: 97.5, ic80_min, ic80_max, ic95_min, ic95_max }, ...]
 *   loading     (bool)   — État de chargement
 */

import React from 'react'
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
  ComposedChart,
} from 'recharts'
import { formatPct } from '../../services/api'

// ============================================================
// Couleurs du thème
// ============================================================
const COLORS = {
  historique: '#3b82f6',
  prevision: '#f97316',
  ic80: 'rgba(249,115,22,0.25)',
  ic95: 'rgba(249,115,22,0.10)',
  reference: '#ef4444',
  grille: 'rgba(51,65,85,0.3)',
  texte: '#94a3b8',
}

/**
 * Tooltip personnalisé
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(51,65,85,0.5)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '12px',
      color: '#e2e8f0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#cbd5e1' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '2px 0', color: entry.color || '#e2e8f0' }}>
          {entry.name} : {formatPct(entry.value)}
        </p>
      ))}
    </div>
  )
}

/**
 * État placeholder — module non encore implémenté
 */
function PlaceholderState() {
  return (
    <div style={styles.placeholder}>
      {/* Icône animée */}
      <div style={styles.placeholderIcon}>
        🔮
      </div>

      {/* Titre */}
      <h3 style={styles.placeholderTitle}>
        Module 4 — Séries Temporelles
      </h3>

      {/* Description */}
      <p style={styles.placeholderDesc}>
        Prévisions du ratio combiné 2024 avec intervalles de confiance
      </p>

      {/* Badge prochainement */}
      <span style={styles.badgeSoon}>
        🔜 Prochainement
      </span>

      {/* Aperçu des fonctionnalités prévues */}
      <div style={styles.featureList}>
        <div style={styles.featureItem}>
          <span style={{ color: COLORS.historique }}>━━</span> Historique observé
        </div>
        <div style={styles.featureItem}>
          <span style={{ color: COLORS.prevision }}>╌╌</span> Prévisions
        </div>
        <div style={styles.featureItem}>
          <span style={{ color: COLORS.prevision, opacity: 0.5 }}>▓▓</span> IC 80% / 95%
        </div>
        <div style={styles.featureItem}>
          <span style={{ color: COLORS.reference }}>╌╌</span> Seuil 100%
        </div>
      </div>

      {/* Graphique skeleton en fond */}
      <div style={styles.skeletonChart}>
        <svg width="100%" height="120" viewBox="0 0 400 120" style={{ opacity: 0.15 }}>
          {/* Grille */}
          <line x1="0" y1="30" x2="400" y2="30" stroke="#94a3b8" strokeDasharray="4" />
          <line x1="0" y1="60" x2="400" y2="60" stroke="#94a3b8" strokeDasharray="4" />
          <line x1="0" y1="90" x2="400" y2="90" stroke="#94a3b8" strokeDasharray="4" />
          {/* Ligne historique simulée */}
          <polyline
            points="20,80 60,70 100,75 140,60 180,65 220,55"
            fill="none"
            stroke={COLORS.historique}
            strokeWidth="2"
          />
          {/* Zone IC simulée */}
          <polygon
            points="220,55 260,45 300,40 340,35 380,30 380,80 340,75 300,70 260,65 220,55"
            fill={COLORS.prevision}
            opacity="0.2"
          />
          {/* Ligne prévision simulée */}
          <polyline
            points="220,55 260,48 300,50 340,45 380,42"
            fill="none"
            stroke={COLORS.prevision}
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          {/* Ligne 100% */}
          <line x1="0" y1="60" x2="400" y2="60" stroke={COLORS.reference} strokeDasharray="6 4" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  )
}

/**
 * Composant principal : graphique de prévisions
 */
function PrevisionsChart({ historique = [], previsions = [], loading = false }) {
  // --- Chargement ---
  if (loading) {
    return (
      <div style={{
        height: 400,
        background: 'rgba(30,41,59,0.4)',
        borderRadius: '8px',
        border: '1px solid rgba(51,65,85,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#475569',
        fontSize: '13px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        🔮 Chargement des prévisions...
      </div>
    )
  }

  // --- PLACEHOLDER : Module pas encore implémenté ---
  // Vérifier si les données sont disponibles
  const hasData = (historique && historique.length > 0) || (previsions && previsions.length > 0)

  if (!hasData) {
    return <PlaceholderState />
  }

  // --- Mode actif : graphique complet (pour quand le module sera prêt) ---
  // Combiner historique + prévisions dans un seul dataset
  const combinedData = [
    ...historique.map(d => ({
      date: d.date,
      historique: d.valeur ?? d.ratio_combine,
      prevision: null,
      ic80_min: null,
      ic80_max: null,
      ic95_min: null,
      ic95_max: null,
    })),
    ...previsions.map(d => ({
      date: d.date,
      historique: null,
      prevision: d.prevu ?? d.valeur,
      ic80_min: d.ic80_min,
      ic80_max: d.ic80_max,
      ic95_min: d.ic95_min,
      ic95_max: d.ic95_max,
    })),
  ]

  return (
    <div style={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart
          data={combinedData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid stroke={COLORS.grille} strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            tick={{ fill: COLORS.texte, fontSize: 11 }}
            axisLine={{ stroke: COLORS.grille }}
            tickLine={{ stroke: COLORS.grille }}
          />

          <YAxis
            tick={{ fill: COLORS.texte, fontSize: 11 }}
            axisLine={{ stroke: COLORS.grille }}
            tickLine={{ stroke: COLORS.grille }}
            tickFormatter={(v) => `${v}%`}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', color: COLORS.texte }} />

          {/* Seuil 100% */}
          <ReferenceLine
            y={100}
            stroke={COLORS.reference}
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{
              value: '100%',
              fill: COLORS.reference,
              fontSize: 11,
              position: 'right',
            }}
          />

          {/* IC 95% — zone la plus large */}
          <Area
            type="monotone"
            dataKey="ic95_max"
            name="IC 95%"
            fill={COLORS.ic95}
            stroke="none"
          />
          <Area
            type="monotone"
            dataKey="ic95_min"
            name="IC 95% (bas)"
            fill="rgba(15,23,42,1)"
            stroke="none"
            legendType="none"
          />

          {/* IC 80% — zone intermédiaire */}
          <Area
            type="monotone"
            dataKey="ic80_max"
            name="IC 80%"
            fill={COLORS.ic80}
            stroke="none"
          />
          <Area
            type="monotone"
            dataKey="ic80_min"
            name="IC 80% (bas)"
            fill="rgba(15,23,42,1)"
            stroke="none"
            legendType="none"
          />

          {/* Historique — ligne pleine bleue */}
          <Line
            type="monotone"
            dataKey="historique"
            name="Historique"
            stroke={COLORS.historique}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
          />

          {/* Prévision — ligne pointillée orange */}
          <Line
            type="monotone"
            dataKey="prevision"
            name="Prévision"
            stroke={COLORS.prevision}
            strokeWidth={2.5}
            strokeDasharray="8 4"
            dot={{ r: 3, fill: COLORS.prevision, stroke: '#1e293b', strokeWidth: 2 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// Styles inline
// ============================================================
const styles = {
  chartContainer: {
    background: 'transparent',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.3)',
    padding: '16px',
  },
  placeholder: {
    borderRadius: '12px',
    border: '1px solid rgba(51,65,85,0.4)',
    background: 'rgba(15,23,42,0.5)',
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: '300px',
  },
  placeholderIcon: {
    fontSize: '48px',
    marginBottom: '4px',
  },
  placeholderTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#cbd5e1',
  },
  placeholderDesc: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
    maxWidth: '400px',
  },
  badgeSoon: {
    fontSize: '12px',
    padding: '5px 16px',
    borderRadius: '20px',
    background: 'rgba(148,163,184,0.15)',
    color: '#94a3b8',
    border: '1px solid rgba(148,163,184,0.25)',
    fontWeight: 600,
    marginTop: '4px',
  },
  featureList: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: '16px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748b',
  },
  skeletonChart: {
    width: '100%',
    maxWidth: '500px',
    marginTop: '16px',
    opacity: 0.6,
  },
}

export default PrevisionsChart
