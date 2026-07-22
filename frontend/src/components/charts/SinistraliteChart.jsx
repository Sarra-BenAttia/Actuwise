/**
 * ACTUWISE — src/components/charts/SinistraliteChart.jsx
 * Graphiques de sinistralité — Module 1.
 *
 * Deux visualisations Recharts :
 *   (a) LineChart — Nombre de sinistres mensuel (2018-2023)
 *   (b) BarChart  — Coût total par garantie
 *
 * Props :
 *   serieMensuelle (array)  — [{ mois: "2018-01", nb_sinistres: 42 }, ...]
 *   parGarantie    (array)  — [{ garantie: "RC", cout_total: 1500000 }, ...]
 *   loading        (bool)   — État de chargement
 */

import React from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
  defs, linearGradient, stop,
} from 'recharts'
import { formatNumber } from '../../services/api'

// ============================================================
// Couleurs du thème
// ============================================================
const COLORS = {
  bleu: '#3b82f6',
  bleuClair: '#93c5fd',
  grille: 'rgba(51,65,85,0.3)',
  texte: '#94a3b8',
  tooltipBg: 'rgba(15,23,42,0.95)',
  tooltipBorder: 'rgba(51,65,85,0.5)',
}

/**
 * Tooltip personnalisé (style sombre)
 */
function CustomTooltip({ active, payload, label, formatter }) {
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
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#cbd5e1' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '2px 0', color: entry.color }}>
          {entry.name} : {formatter ? formatter(entry.value) : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  )
}

/**
 * Skeleton de chargement pour un graphique
 */
function ChartSkeleton({ height = 300 }) {
  return (
    <div style={{
      height,
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
 * Composant principal : deux graphiques sinistralité
 */
function SinistraliteChart({ serieMensuelle = [], parGarantie = [], loading = false }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <ChartSkeleton height={300} />
        <ChartSkeleton height={280} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ========================================= */}
      {/* (a) LineChart — Sinistres mensuels        */}
      {/* ========================================= */}
      <div style={styles.chartContainer}>
        <h4 style={styles.chartTitle}>📈 Évolution mensuelle des sinistres (2018-2023)</h4>

        {serieMensuelle.length === 0 ? (
          <div style={styles.noData}>Aucune donnée mensuelle disponible</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={serieMensuelle}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              {/* Grille subtile */}
              <CartesianGrid stroke={COLORS.grille} strokeDasharray="3 3" />

              {/* Axe X : mois */}
              <XAxis
                dataKey="mois"
                tick={{ fill: COLORS.texte, fontSize: 11 }}
                axisLine={{ stroke: COLORS.grille }}
                tickLine={{ stroke: COLORS.grille }}
                interval="preserveStartEnd"
                angle={-30}
                textAnchor="end"
                height={50}
              />

              {/* Axe Y : nombre de sinistres */}
              <YAxis
                tick={{ fill: COLORS.texte, fontSize: 11 }}
                axisLine={{ stroke: COLORS.grille }}
                tickLine={{ stroke: COLORS.grille }}
                tickFormatter={(v) => formatNumber(v)}
              />

              {/* Tooltip */}
              <Tooltip content={<CustomTooltip />} />

              {/* Légende */}
              <Legend
                wrapperStyle={{ fontSize: '12px', color: COLORS.texte }}
              />

              {/* Ligne principale */}
              <Line
                type="monotone"
                dataKey="nb_sinistres"
                name="Nb sinistres"
                stroke={COLORS.bleu}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: COLORS.bleu, stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ========================================= */}
      {/* (b) BarChart — Coût total par garantie    */}
      {/* ========================================= */}
      <div style={styles.chartContainer}>
        <h4 style={styles.chartTitle}>📊 Coût total des sinistres par garantie</h4>

        {parGarantie.length === 0 ? (
          <div style={styles.noData}>Aucune donnée par garantie disponible</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={parGarantie}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              {/* Définition du gradient bleu */}
              <defs>
                <linearGradient id="gradientBleu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.bleu} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={COLORS.bleu} stopOpacity={0.3} />
                </linearGradient>
              </defs>

              {/* Grille subtile */}
              <CartesianGrid stroke={COLORS.grille} strokeDasharray="3 3" />

              {/* Axe X : garantie */}
              <XAxis
                dataKey="garantie"
                tick={{ fill: COLORS.texte, fontSize: 11 }}
                axisLine={{ stroke: COLORS.grille }}
                tickLine={{ stroke: COLORS.grille }}
              />

              {/* Axe Y : coût total */}
              <YAxis
                tick={{ fill: COLORS.texte, fontSize: 11 }}
                axisLine={{ stroke: COLORS.grille }}
                tickLine={{ stroke: COLORS.grille }}
                tickFormatter={(v) => {
                  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
                  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
                  return formatNumber(v)
                }}
              />

              {/* Tooltip */}
              <Tooltip
                content={<CustomTooltip formatter={(v) => `${formatNumber(v)} TND`} />}
              />

              {/* Légende */}
              <Legend
                wrapperStyle={{ fontSize: '12px', color: COLORS.texte }}
              />

              {/* Barres avec gradient */}
              <Bar
                dataKey="cout_total"
                name="Coût total (TND)"
                fill="url(#gradientBleu)"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
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
  chartTitle: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#cbd5e1',
    letterSpacing: '0.02em',
  },
  noData: {
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#475569',
    fontSize: '14px',
  },
}

export default SinistraliteChart
