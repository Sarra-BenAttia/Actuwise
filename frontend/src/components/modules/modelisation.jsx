'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const CHART_PRIMARY = '#0284c7'
const CHART_SECONDARY = '#0ea5e9'
const CHART_ERROR = '#dc2626'

/* ---- Lorenz curve ---- */
const lorenzData = [
  { x: 0, equality: 0, glm: 0, xgb: 0, cann: 0 },
  { x: 10, equality: 10, glm: 4.2, xgb: 3.1, cann: 2.8 },
  { x: 20, equality: 20, glm: 9.8, xgb: 7.6, cann: 6.9 },
  { x: 30, equality: 30, glm: 16.4, xgb: 13.5, cann: 12.4 },
  { x: 40, equality: 40, glm: 24.2, xgb: 20.8, cann: 19.3 },
  { x: 50, equality: 50, glm: 33.6, xgb: 29.7, cann: 27.8 },
  { x: 60, equality: 60, glm: 44.2, xgb: 40.5, cann: 38.4 },
  { x: 70, equality: 70, glm: 56.1, xgb: 52.8, cann: 50.7 },
  { x: 80, equality: 80, glm: 68.4, xgb: 65.9, cann: 63.8 },
  { x: 90, equality: 90, glm: 81.2, xgb: 79.4, cann: 77.6 },
  { x: 100, equality: 100, glm: 100, xgb: 100, cann: 100 },
]

/* ---- SHAP feature importance ---- */
const shapData = [
  { feature: 'Âge du conducteur', importance: 0.342 },
  { feature: 'Type véhicule', importance: 0.281 },
  { feature: 'Zone géographique', importance: 0.228 },
  { feature: 'Ancienneté du permis', importance: 0.196 },
  { feature: 'Usage du véhicule', importance: 0.174 },
  { feature: 'Puissance fiscale', importance: 0.143 },
  { feature: 'Énergie véhicule', importance: 0.118 },
  { feature: 'Bonus-Malus', importance: 0.097 },
]

/* ---- Waterfall individual premium decomposition ---- */
const waterfallData = [
  { label: 'Prime de base', value: 420, cumul: 420, type: 'base' },
  { label: 'Âge 23 ans', value: 184, cumul: 604, type: 'up' },
  { label: 'Zone Tunis', value: 96, cumul: 700, type: 'up' },
  { label: 'Taxi VU', value: 238, cumul: 938, type: 'up' },
  { label: 'Sans accident', value: -112, cumul: 826, type: 'down' },
  { label: 'Puissance 7CV', value: 68, cumul: 894, type: 'up' },
  { label: 'Prime finale', value: 894, cumul: 894, type: 'total' },
]

/* ---- Heatmap ratio combiné par segment ---- */
const heatmapSegments = [
  { usage: 'VP', energie: 'Diesel', tunis: 92.4, sfax: 88.6, sousse: 90.1, nabeul: 85.3 },
  { usage: 'VP', energie: 'Essence', tunis: 96.8, sfax: 92.3, sousse: 94.2, nabeul: 89.7 },
  { usage: 'VU', energie: 'Diesel', tunis: 101.3, sfax: 97.8, sousse: 99.4, nabeul: 94.2 },
  { usage: 'Taxi', energie: 'GPL', tunis: 108.6, sfax: 103.4, sousse: 105.7, nabeul: 99.8 },
  { usage: 'Moto', energie: 'Essence', tunis: 85.2, sfax: 81.4, sousse: 83.1, nabeul: 78.9 },
]

const regions = ['tunis', 'sfax', 'sousse', 'nabeul'] as const

function getRatioClass(val: number): string {
  if (val > 105) return 'cell-alert'
  if (val > 100) return 'cell-heat-5'
  if (val > 95) return 'cell-heat-4'
  if (val > 90) return 'cell-heat-3'
  if (val > 85) return 'cell-heat-2'
  return 'cell-heat-1'
}

const tabs = ['Niveau 1 — GLM', 'Niveau 2 — ML', 'Niveau 3 — CANN', 'Niveau 4 — XAI']

const modelBenchmark = [
  { metric: 'RMSE', glm: '0.842', xgb: '0.714', cann: '0.692' },
  { metric: 'Coefficient de Gini', glm: '0.312', xgb: '0.398', cann: '0.421' },
  { metric: 'AIC', glm: '148 420', xgb: '—', cann: '—' },
  { metric: 'Log-vraisemblance', glm: '-74 038', xgb: '—', cann: '-71 284' },
  { metric: 'Temps entrainement', glm: '2 min', xgb: '8 min', cann: '47 min' },
]

export function ModelisationModule() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      {/* Tabs */}
      <div className="module-tabs">
        <md-tabs
          active-tab-index={activeTab}
          onchange={(e: Event) => setActiveTab((e.target as HTMLElement & { activeTabIndex: number }).activeTabIndex)}
        >
          {tabs.map((t, i) => (
            <md-primary-tab key={i}>{t}</md-primary-tab>
          ))}
        </md-tabs>
      </div>

      {/* Benchmark table — always visible */}
      <div className="data-table-card" style={{ marginBottom: 16 }}>
        <div className="chart-card-header" style={{ marginBottom: 12 }}>
          <div>
            <div className="md-typescale-title-medium chart-card-title">
              <md-icon>leaderboard</md-icon>
              Benchmark des Modèles — GLM vs XGBoost vs CANN
            </div>
            <div className="md-typescale-body-small chart-card-subtitle">Métriques de performance sur jeu de test (20% des données)</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Métrique</th>
              <th>GLM (Poisson)</th>
              <th>XGBoost</th>
              <th style={{ color: 'var(--md-sys-color-primary)' }}>CANN ★ Meilleur</th>
            </tr>
          </thead>
          <tbody>
            {modelBenchmark.map((row) => (
              <tr key={row.metric}>
                <td style={{ fontWeight: 600 }}>{row.metric}</td>
                <td>{row.glm}</td>
                <td>{row.xgb}</td>
                <td style={{ fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>{row.cann}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="two-col-grid">
        {/* Lorenz curve */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>area_chart</md-icon>
                Courbe de Lorenz
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">
                Gini GLM: 0.312 | XGBoost: 0.398 | CANN: 0.421
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lorenzData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" />
              <XAxis dataKey="x" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ background: 'var(--md-sys-color-surface-container-highest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line dataKey="equality" name="Égalité parfaite" stroke="var(--md-sys-color-outline)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
              <Line dataKey="glm" name="GLM" stroke={CHART_SECONDARY} dot={false} strokeWidth={2} />
              <Line dataKey="xgb" name="XGBoost" stroke={CHART_PRIMARY} dot={false} strokeWidth={2} />
              <Line dataKey="cann" name="CANN" stroke="#0c4a6e" dot={false} strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* SHAP summary */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>bar_chart</md-icon>
                SHAP — Importance des Variables
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Contribution moyenne (|SHAP|) — modèle CANN</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            {shapData.map((item) => (
              <div key={item.feature} className="shap-bar-row">
                <div className="shap-bar-label">{item.feature}</div>
                <div className="shap-bar-track">
                  <div className="shap-bar-fill" style={{ width: `${(item.importance / 0.35) * 100}%` }} />
                </div>
                <div className="shap-bar-value">{item.importance.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col-grid">
        {/* Waterfall prime individuelle */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>account_tree</md-icon>
                Décomposition Prime Individuelle (DT)
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Assuré M. Ben Ali, 23 ans, taxi, Tunis</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {waterfallData.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="md-typescale-label-medium" style={{ width: 140, flexShrink: 0, color: 'var(--md-sys-color-on-surface-variant)' }}>{item.label}</span>
                <div style={{ flex: 1, background: 'var(--md-sys-color-surface-container)', borderRadius: 4, height: 24, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute',
                    height: '100%',
                    width: `${Math.abs(item.value) / 950 * 100}%`,
                    left: item.type === 'down' ? `${(item.cumul - Math.abs(item.value)) / 950 * 100}%` : `${(item.cumul - item.value) / 950 * 100}%`,
                    background: item.type === 'total' ? 'var(--md-sys-color-primary)' : item.type === 'up' ? 'var(--md-sys-color-secondary)' : item.type === 'base' ? 'var(--md-sys-color-tertiary)' : CHART_ERROR,
                    borderRadius: 3,
                  }} />
                </div>
                <span className="md-typescale-label-large" style={{ width: 52, textAlign: 'right', fontWeight: 700, color: item.type === 'down' ? CHART_ERROR : 'var(--md-sys-color-primary)', flexShrink: 0 }}>
                  {item.type !== 'base' && item.type !== 'total' ? (item.value > 0 ? '+' : '') : ''}{item.value} DT
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap RC par segment */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>grid_view</md-icon>
                Heatmap RC — Usage × Énergie × Région
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Ratio Combiné (%) — alertes si {'>'}100%</div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Usage</th>
                  <th>Énergie</th>
                  <th>Tunis</th>
                  <th>Sfax</th>
                  <th>Sousse</th>
                  <th>Nabeul</th>
                </tr>
              </thead>
              <tbody>
                {heatmapSegments.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.usage}</td>
                    <td>{row.energie}</td>
                    {regions.map((r) => (
                      <td key={r} className={getRatioClass(row[r])} style={{ textAlign: 'center' }}>{row[r]}%</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
