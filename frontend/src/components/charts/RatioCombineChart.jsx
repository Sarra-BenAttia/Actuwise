/**
 * ACTUWISE — src/components/charts/RatioCombineChart.jsx
 * Graphique composé du ratio combiné.
 *
 * Recharts ComposedChart :
 *   - BarChart  : ratio sinistres (S/P) — bleu #3b82f6
 *   - LineChart : ratio combiné         — orange #f97316
 *   - ReferenceLine à 100%             — rouge pointillé #ef4444
 *
 * Props :
 *   data    (array)  — [{ annee: 2018, ratio_sinistres: 82.5, ratio_combine: 97.2 }, ...]
 *   loading (bool)   — État de chargement
 */

import React from 'react'
import {
  ComposedChart, Bar, Line, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatPct } from '../../services/api'

// ============================================================
// Couleurs du thème
// ============================================================
const COLORS = {
  barres: '#3b82f6',     // Bleu — ratio sinistres
  ligne: '#f97316',       // Orange — ratio combiné
  reference: '#ef4444',   // Rouge — seuil 100%
  grille: 'rgba(51,65,85,0.3)',
  texte: '#94a3b8',
  tooltipBg: 'rgba(15,23,42,0.95)',
  tooltipBorder: 'rgba(51,65,85,0.5)',
}

/**
 * Tooltip personnalisé (style sombre)
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div style={{
      background: COLORS.tooltipBg,
      border: `1px solid ${COLORS.tooltipBorder}`,
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '12px',
      color: '#e2e8f0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#cbd5e1' }}>
        Année {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '2px 0', color: entry.color }}>
          {entry.name} : {formatPct(entry.value)}
        </p>
      ))}
      {/* Indicateur visuel au-dessus ou en-dessous de 100% */}
      {payload.find(p => p.dataKey === 'ratio_combine') && (
        <p style={{
          margin: '6px 0 0',
          fontSize: '11px',
          color: payload.find(p => p.dataKey === 'ratio_combine').value > 100
            ? '#f87171' : '#4ade80',
          fontWeight: 600,
        }}>
          {payload.find(p => p.dataKey === 'ratio_combine').value > 100
            ? '⚠ Au-dessus du seuil' : '✅ En-dessous du seuil'}
        </p>
      )}
    </div>
  )
}

/**
 * Skeleton de chargement
 */
function ChartSkeleton() {
  return (
    <div style={{
      height: 350,
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
      📊 Chargement du graphique...
    </div>
  )
}

/**
 * Composant principal : graphique ratio combiné
 */
function RatioCombineChart({ data = [], loading = false }) {
  // --- Chargement ---
  if (loading) {
    return <ChartSkeleton />
  }

  // --- Données vides ---
  if (!data || data.length === 0) {
    return (
      <div style={styles.noData}>
        <span style={{ fontSize: '28px' }}>📉</span>
        <p>Données de ratio combiné non disponibles</p>
      </div>
    )
  }

  // Calcul des limites Y pour bien encadrer les données
  const allValues = data.flatMap(d => [
    Number(d.ratio_sinistres || 0),
    Number(d.ratio_combine || 0),
  ].filter(v => v > 0))
  const yMin = Math.floor(Math.min(...allValues, 100) / 10) * 10 - 5
  const yMax = Math.ceil(Math.max(...allValues, 100) / 10) * 10 + 5

  return (
    <div style={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
        >
          {/* Définition du gradient bleu pour les barres */}
          <defs>
            <linearGradient id="gradientRatioBarres" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.barres} stopOpacity={0.85} />
              <stop offset="100%" stopColor={COLORS.barres} stopOpacity={0.3} />
            </linearGradient>
          </defs>

          {/* Grille subtile */}
          <CartesianGrid stroke={COLORS.grille} strokeDasharray="3 3" />

          {/* Axe X : année */}
          <XAxis
            dataKey="annee"
            tick={{ fill: COLORS.texte, fontSize: 12 }}
            axisLine={{ stroke: COLORS.grille }}
            tickLine={{ stroke: COLORS.grille }}
          />

          {/* Axe Y : pourcentage */}
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: COLORS.texte, fontSize: 11 }}
            axisLine={{ stroke: COLORS.grille }}
            tickLine={{ stroke: COLORS.grille }}
            tickFormatter={(v) => `${v}%`}
          />

          {/* Tooltip personnalisé */}
          <Tooltip content={<CustomTooltip />} />

          {/* Légende */}
          <Legend
            wrapperStyle={{ fontSize: '12px', color: COLORS.texte, paddingTop: '8px' }}
          />

          {/* --- Ligne de référence à 100% (seuil de rentabilité) --- */}
          <ReferenceLine
            y={100}
            stroke={COLORS.reference}
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{
              value: 'Seuil 100%',
              fill: COLORS.reference,
              fontSize: 11,
              fontWeight: 600,
              position: 'right',
            }}
          />

          {/* --- Barres : ratio sinistres (S/P) --- */}
          <Bar
            dataKey="ratio_sinistres"
            name="Ratio S/P"
            fill="url(#gradientRatioBarres)"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />

          {/* --- Ligne : ratio combiné --- */}
          <Line
            type="monotone"
            dataKey="ratio_combine"
            name="Ratio combiné"
            stroke={COLORS.ligne}
            strokeWidth={3}
            dot={{ r: 5, fill: COLORS.ligne, stroke: '#1e293b', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: COLORS.ligne, stroke: '#fff', strokeWidth: 2 }}
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
  noData: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px',
    color: '#475569',
    gap: '8px',
    fontSize: '14px',
  },
}

export default RatioCombineChart
