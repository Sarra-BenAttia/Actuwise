'use client'

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

const CHART_PRIMARY = '#0284c7'
const CHART_SECONDARY = '#0ea5e9'

/* Historical + forecast data */
const forecastData = [
  { period: 'Jan 2022', historical: 4820, arima: null, lstm: null, ci_low: null, ci_high: null },
  { period: 'Avr 2022', historical: 5140, arima: null, lstm: null, ci_low: null, ci_high: null },
  { period: 'Juil 2022', historical: 5620, arima: null, lstm: null, ci_low: null, ci_high: null },
  { period: 'Oct 2022', historical: 5280, arima: null, lstm: null, ci_low: null, ci_high: null },
  { period: 'Jan 2023', historical: 5480, arima: null, lstm: null, ci_low: null, ci_high: null },
  { period: 'Avr 2023', historical: 5840, arima: null, lstm: null, ci_low: null, ci_high: null },
  { period: 'Juil 2023', historical: 6240, arima: null, lstm: null, ci_low: null, ci_high: null },
  { period: 'Oct 2023', historical: 5920, arima: null, lstm: null, ci_low: null, ci_high: null },
  // Forecast start
  { period: 'Jan 2024', historical: null, arima: 6080, lstm: 6120, ci_low: 5640, ci_high: 6540 },
  { period: 'Avr 2024', historical: null, arima: 6380, lstm: 6440, ci_low: 5820, ci_high: 6960 },
  { period: 'Juil 2024', historical: null, arima: 6840, lstm: 6920, ci_low: 6120, ci_high: 7620 },
  { period: 'Oct 2024', historical: null, arima: 6480, lstm: 6560, ci_low: 5680, ci_high: 7320 },
  { period: 'Jan 2025', historical: null, arima: 6720, lstm: 6810, ci_low: 5780, ci_high: 7720 },
  { period: 'Avr 2025', historical: null, arima: 7060, lstm: 7180, ci_low: 5940, ci_high: 8120 },
]

const metrics = [
  { model: 'ARIMA(2,1,2)', rmse: '342', mae: '289', mape: '4.8%' },
  { model: 'SARIMA(2,1,2)(1,1,1)12', rmse: '298', mae: '251', mape: '4.1%' },
  { model: 'LSTM (2 couches)', rmse: '274', mae: '226', mape: '3.7%' },
]

export function SeriesModule() {
  return (
    <div>
      {/* Seasonality badge */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="kpi-badge alert" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
          <md-icon style={{ fontSize: 16 }}>calendar_month</md-icon>
          Saisonnalité détectée — Pic estival Juillet (+14%)
        </div>
        <div className="kpi-badge ok" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
          <md-icon style={{ fontSize: 16 }}>trending_up</md-icon>
          Tendance haussière +6.2% annualisée
        </div>
      </div>

      {/* Forecast chart */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card-header">
          <div>
            <div className="md-typescale-title-medium chart-card-title">
              <md-icon>timeline</md-icon>
              Prévision de la Sinistralité Mensuelle — ARIMA vs LSTM
            </div>
            <div className="md-typescale-body-small chart-card-subtitle">
              Historique 2022–2023 + Prévision 12 mois avec intervalle de confiance 95%
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={forecastData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.12} />
                <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" />
            <XAxis dataKey="period" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
            <Tooltip
              formatter={(v: number, name: string) => [`${v?.toLocaleString('fr-FR')} sinistres`, name]}
              contentStyle={{ background: 'var(--md-sys-color-surface-container-highest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
            <Area dataKey="ci_high" name="IC supérieur" fill="url(#gradCI)" stroke="transparent" stackId="ci" connectNulls />
            <Area dataKey="ci_low" name="IC inférieur" fill="var(--md-sys-color-background)" stroke="transparent" stackId="ci" connectNulls />
            <ReferenceLine x="Jan 2024" stroke="var(--md-sys-color-outline)" strokeDasharray="6 3" label={{ value: 'Prévision →', fill: 'var(--md-sys-color-primary)', fontSize: 11, position: 'insideTopRight' }} />
            <Line dataKey="historical" name="Historique" stroke={CHART_PRIMARY} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            <Line dataKey="arima" name="ARIMA" stroke={CHART_SECONDARY} strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls />
            <Line dataKey="lstm" name="LSTM" stroke="#0c4a6e" strokeWidth={2} strokeDasharray="3 3" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics table */}
      <div className="data-table-card">
        <div className="chart-card-header" style={{ marginBottom: 12 }}>
          <div>
            <div className="md-typescale-title-medium chart-card-title">
              <md-icon>assessment</md-icon>
              Métriques de Performance des Modèles
            </div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Modèle</th>
              <th>RMSE</th>
              <th>MAE</th>
              <th>MAPE</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, i) => (
              <tr key={row.model}>
                <td style={{ fontWeight: 600, color: i === 2 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)' }}>
                  {i === 2 && <md-icon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }}>star</md-icon>}
                  {row.model}
                </td>
                <td style={{ fontWeight: i === 2 ? 700 : 400 }}>{row.rmse}</td>
                <td style={{ fontWeight: i === 2 ? 700 : 400 }}>{row.mae}</td>
                <td style={{ fontWeight: i === 2 ? 700 : 400, color: i === 2 ? 'var(--md-sys-color-primary)' : 'inherit' }}>{row.mape}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
