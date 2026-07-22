'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart as HorizBarChart,
  Cell
} from 'recharts'

const CHART_PRIMARY = '#0284c7'
const CHART_SECONDARY = '#0ea5e9'
const CHART_TERTIARY = '#0369a1'

/* ---- Reserve comparison ---- */
const reserveData = [
  { year: '2018', cl: 1242, bf: 1198, cc: 1220, diff_bf: -3.5, diff_cc: -1.8 },
  { year: '2019', cl: 2486, bf: 2392, cc: 2420, diff_bf: -3.8, diff_cc: -2.7 },
  { year: '2020', cl: 3840, bf: 3720, cc: 3795, diff_bf: -3.1, diff_cc: -1.2 },
  { year: '2021', cl: 5630, bf: 5460, cc: 5540, diff_bf: -3.0, diff_cc: -1.6 },
  { year: '2022', cl: 8920, bf: 8640, cc: 8770, diff_bf: -3.1, diff_cc: -1.7 },
  { year: '2023', cl: 12660, bf: 12200, cc: 12380, diff_bf: -3.6, diff_cc: -2.2 },
]

/* ---- Tornado chart ---- */
const tornadoData = [
  { label: 'Inflation sinistres +15%', impact: 3480 },
  { label: 'Cadence règlement +30%', impact: 2640 },
  { label: 'Inflation sinistres +10%', impact: 2280 },
  { label: 'Cadence règlement +20%', impact: 1760 },
  { label: 'Inflation sinistres +5%', impact: 1120 },
  { label: 'Cadence règlement +10%', impact: 880 },
]

export function ProvissionnementModule() {
  const [cadence, setCadence] = useState(10)
  const [inflation, setInflation] = useState(5)

  const stressImpact = Math.round((cadence * 88) + (inflation * 110))

  return (
    <div>
      {/* Reserve comparison table */}
      <div className="data-table-card" style={{ marginBottom: 16 }}>
        <div className="chart-card-header" style={{ marginBottom: 12 }}>
          <div>
            <div className="md-typescale-title-medium chart-card-title">
              <md-icon>compare_arrows</md-icon>
              Comparaison des Méthodes de Provisionnement (kDT)
            </div>
            <div className="md-typescale-body-small chart-card-subtitle">Chain-Ladder vs Bornhuetter-Ferguson vs Cape Cod — par année de survenance</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Année</th>
              <th>Chain-Ladder</th>
              <th>Bornhuetter-Ferguson</th>
              <th>Écart BF (%)</th>
              <th>Cape Cod</th>
              <th>Écart CC (%)</th>
            </tr>
          </thead>
          <tbody>
            {reserveData.map((row) => (
              <tr key={row.year}>
                <td style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>{row.year}</td>
                <td style={{ fontWeight: 600 }}>{row.cl.toLocaleString('fr-FR')}</td>
                <td>{row.bf.toLocaleString('fr-FR')}</td>
                <td style={{ color: 'var(--md-sys-color-tertiary)', fontWeight: 600 }}>{row.diff_bf}%</td>
                <td>{row.cc.toLocaleString('fr-FR')}</td>
                <td style={{ color: 'var(--md-sys-color-tertiary)', fontWeight: 600 }}>{row.diff_cc}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grouped bar chart */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card-header">
          <div>
            <div className="md-typescale-title-medium chart-card-title">
              <md-icon>bar_chart</md-icon>
              Réserves par Méthode et Année de Survenance
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={reserveData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}M`} />
            <Tooltip formatter={(v: number) => [`${v.toLocaleString('fr-FR')} kDT`]} contentStyle={{ background: 'var(--md-sys-color-surface-container-highest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Bar dataKey="cl" name="Chain-Ladder" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="bf" name="Bornhuetter-Ferguson" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="cc" name="Cape Cod" fill={CHART_TERTIARY} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="two-col-grid">
        {/* Stress tests */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>speed</md-icon>
                Stress Tests — Sensibilité des Réserves
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Impact sur la réserve IBNR totale (kDT)</div>
            </div>
          </div>
          <div className="stress-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="stress-card">
              <div className="stress-card-header">
                <div>
                  <div className="md-typescale-label-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>Cadence de règlement</div>
                  <div className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Accélération des paiements</div>
                </div>
                <div className="md-typescale-title-medium" style={{ color: 'var(--md-sys-color-primary)', fontWeight: 700 }}>+{cadence}%</div>
              </div>
              <md-slider
                min={0} max={30} step={5} value={cadence} labeled ticks
                style={{ width: '100%' }}
                oninput={(e: Event) => setCadence(Number((e.target as HTMLInputElement).value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {[0, 10, 20, 30].map(v => (
                  <span key={v} className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{v}%</span>
                ))}
              </div>
            </div>
            <div className="stress-card">
              <div className="stress-card-header">
                <div>
                  <div className="md-typescale-label-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>Inflation des sinistres</div>
                  <div className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Hausse du coût moyen</div>
                </div>
                <div className="md-typescale-title-medium" style={{ color: 'var(--md-sys-color-primary)', fontWeight: 700 }}>+{inflation}%</div>
              </div>
              <md-slider
                min={0} max={15} step={5} value={inflation} labeled ticks
                style={{ width: '100%' }}
                oninput={(e: Event) => setInflation(Number((e.target as HTMLInputElement).value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {[0, 5, 10, 15].map(v => (
                  <span key={v} className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{v}%</span>
                ))}
              </div>
            </div>
          </div>
          <div className="stress-card" style={{ background: 'var(--md-sys-color-error-container)', borderColor: 'var(--md-sys-color-error)', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="md-typescale-label-large" style={{ color: 'var(--md-sys-color-on-error-container)' }}>Impact total estimé</div>
                <div className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-error)' }}>Surcroît de réserves nécessaire</div>
              </div>
              <div className="md-typescale-headline-small" style={{ color: 'var(--md-sys-color-error)', fontWeight: 700 }}>
                +{stressImpact.toLocaleString('fr-FR')} kDT
              </div>
            </div>
          </div>
        </div>

        {/* Tornado chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>swap_horiz</md-icon>
                Tornado Chart — Hypothèses par Impact
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Classement des scénarios de stress (kDT)</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            {tornadoData.map((item, i) => (
              <div key={i} className="shap-bar-row">
                <div className="shap-bar-label" style={{ width: 180, fontSize: '0.77rem' }}>{item.label}</div>
                <div className="shap-bar-track">
                  <div
                    className="shap-bar-fill"
                    style={{ width: `${(item.impact / 3500) * 100}%`, background: i < 2 ? 'var(--md-sys-color-error)' : i < 4 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-tertiary)' }}
                  />
                </div>
                <div className="shap-bar-value">{item.impact.toLocaleString('fr-FR')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
