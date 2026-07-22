/**
 * ACTUWISE — src/components/charts/LorentzChart.jsx
 * Courbe de Lorenz — Module 3 Modélisation.
 *
 * LineChart Recharts avec 4 courbes :
 *   - GLM      (gris #94a3b8)
 *   - XGBoost  (bleu #3b82f6)
 *   - CANN     (vert #22c55e)
 *   - Diagonale 45° — modèle aléatoire (grise pointillée)
 *
 * La courbe de Lorenz mesure le pouvoir de discrimination des modèles :
 * plus la courbe s'éloigne de la diagonale, meilleur est le modèle.
 *
 * Props :
 *   data    (array)  — [{ percentile: 0.1, glm: 0.05, xgboost: 0.03, cann: 0.02, random: 0.1 }, ...]
 *   loading (bool)   — État de chargement
 */

import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ============================================================
// Couleurs des modèles
// ============================================================
const MODEL_COLORS = {
  glm: '#94a3b8',      // Gris
  xgboost: '#3b82f6',  // Bleu
  cann: '#22c55e',      // Vert
  random: '#64748b',    // Gris foncé (diagonale)
}

const MODEL_LABELS = {
  glm: 'GLM',
  xgboost: 'XGBoost',
  cann: 'CANN',
  random: 'Aléatoire (45°)',
}

/**
 * Tooltip personnalisé (style sombre)
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
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#cbd5e1' }}>
        Percentile : {(Number(label) * 100).toFixed(0)}%
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '2px 0', color: entry.color }}>
          {entry.name} : {(Number(entry.value) * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

/**
 * Skeleton de chargement
 */
function ChartSkeleton() {
  return (
    <div style={{
      height: 380,
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
      📈 Chargement de la courbe de Lorenz...
    </div>
  )
}

/**
 * Génère les données de la diagonale 45° si absentes des données
 */
function addDiagonale(data) {
  if (!data || data.length === 0) return data
  // Vérifier si la diagonale est déjà présente
  if ('random' in data[0]) return data
  return data.map(d => ({
    ...d,
    random: d.percentile ?? d.x ?? 0,
  }))
}

/**
 * Composant principal : courbe de Lorenz
 */
function LorentzChart({ data = [], loading = false }) {
  // --- Chargement ---
  if (loading) {
    return <ChartSkeleton />
  }

  // --- Données vides ---
  if (!data || data.length === 0) {
    return (
      <div style={styles.noData}>
        <span style={{ fontSize: '28px' }}>📉</span>
        <p>Courbe de Lorenz non disponible</p>
      </div>
    )
  }

  // Ajouter la diagonale 45° si elle n'est pas présente
  const chartData = addDiagonale(data)

  // Détecter les clés de modèles présentes
  const sampleRow = chartData[0] || {}
  const modelKeys = ['glm', 'xgboost', 'cann'].filter(k => k in sampleRow)

  return (
    <div style={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          {/* Grille subtile */}
          <CartesianGrid stroke="rgba(51,65,85,0.3)" strokeDasharray="3 3" />

          {/* Axe X : percentile de prime */}
          <XAxis
            dataKey="percentile"
            type="number"
            domain={[0, 1]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(51,65,85,0.3)' }}
            tickLine={{ stroke: 'rgba(51,65,85,0.3)' }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            label={{
              value: 'Part cumulée des assurés (triés par prime)',
              fill: '#64748b',
              fontSize: 11,
              position: 'insideBottom',
              offset: -5,
            }}
          />

          {/* Axe Y : part cumulée des sinistres */}
          <YAxis
            type="number"
            domain={[0, 1]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(51,65,85,0.3)' }}
            tickLine={{ stroke: 'rgba(51,65,85,0.3)' }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            label={{
              value: 'Part cumulée des sinistres',
              fill: '#64748b',
              fontSize: 11,
              angle: -90,
              position: 'insideLeft',
              offset: 10,
            }}
          />

          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />

          {/* Légende */}
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '8px' }}
          />

          {/* --- Diagonale 45° (modèle aléatoire) --- */}
          <Line
            type="linear"
            dataKey="random"
            name={MODEL_LABELS.random}
            stroke={MODEL_COLORS.random}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={false}
          />

          {/* --- Courbes des modèles --- */}
          {modelKeys.map(key => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={MODEL_LABELS[key]}
              stroke={MODEL_COLORS[key]}
              strokeWidth={key === 'cann' ? 3 : 2}
              dot={false}
              activeDot={{
                r: 5,
                fill: MODEL_COLORS[key],
                stroke: '#1e293b',
                strokeWidth: 2,
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Légende interprétative */}
      <div style={styles.interpretation}>
        <span style={{ color: '#64748b', fontSize: '11px' }}>
          💡 Plus la courbe s'éloigne de la diagonale, meilleur est le pouvoir de discrimination du modèle.
        </span>
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
  noData: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px',
    color: '#475569',
    gap: '8px',
    fontSize: '14px',
  },
  interpretation: {
    padding: '8px 0 0',
    borderTop: '1px solid rgba(51,65,85,0.2)',
    marginTop: '8px',
    textAlign: 'center',
  },
}

export default LorentzChart
