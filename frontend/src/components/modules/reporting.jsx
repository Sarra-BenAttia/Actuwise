'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts'

const CHART_PRIMARY = '#0284c7'
const CHART_ERROR = '#dc2626'

const execData = [
  { year: '2018', rc: 92.4, sp: 61.2, frais: 31.2 },
  { year: '2019', rc: 96.1, sp: 64.5, frais: 31.6 },
  { year: '2020', rc: 89.3, sp: 58.7, frais: 30.6 },
  { year: '2021', rc: 101.2, sp: 68.9, frais: 32.3 },
  { year: '2022', rc: 104.8, sp: 71.3, frais: 33.5 },
  { year: '2023', rc: 98.6, sp: 66.2, frais: 32.4 },
]

const alerts = [
  { level: 'error', icon: 'error', message: 'Ratio Combiné 2022 — 104.8% (dépassement de 4.8 pts)', detail: 'Segment Taxi — Zone Grand Tunis' },
  { level: 'error', icon: 'error', message: 'Ratio Combiné 2021 — 101.2% (dépassement de 1.2 pts)', detail: 'Segment VU Diesel — Sousse' },
  { level: 'warning', icon: 'warning', message: 'Ratio Sinistres 2022 — 71.3% (seuil 70% dépassé)', detail: 'Branches Corporels en hausse (+8.2%)' },
  { level: 'warning', icon: 'warning', message: 'Coût moyen en hausse de +4.8% — 2023 vs 2022', detail: 'Impact inflation matières premières auto' },
  { level: 'warning', icon: 'warning', message: 'Fréquence Taxi 15.6% — Segment le plus sinistrant', detail: 'Revoir tarification branche Taxi' },
]

export function ReportingModule() {
  return (
    <div>
      {/* Header with export button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="md-typescale-title-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>Tableau de Bord Exécutif</div>
          <div className="md-typescale-body-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Assurance BIAT — Branche Automobile — 2018–2023</div>
        </div>
        <md-filled-button>
          <md-icon slot="icon">picture_as_pdf</md-icon>
          Exporter en PDF
        </md-filled-button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <md-outlined-select label="Branche" style={{ minWidth: 140 }}>
          <md-select-option value="auto" selected headline="Automobile" />
          <md-select-option value="incendie" headline="Incendie" />
          <md-select-option value="rc" headline="RC Générale" />
        </md-outlined-select>
        <md-outlined-select label="Exercice" style={{ minWidth: 120 }}>
          {['2018','2019','2020','2021','2022','2023','2018-2023'].map(y => (
            <md-select-option key={y} value={y} selected={y === '2018-2023'} headline={y} />
          ))}
        </md-outlined-select>
        <md-outlined-select label="Région" style={{ minWidth: 140 }}>
          <md-select-option value="all" selected headline="Toutes régions" />
          <md-select-option value="tunis" headline="Grand Tunis" />
          <md-select-option value="sfax" headline="Sfax" />
          <md-select-option value="sousse" headline="Sousse" />
        </md-outlined-select>
        <md-outlined-select label="Segment" style={{ minWidth: 140 }}>
          <md-select-option value="all" selected headline="Tous segments" />
          <md-select-option value="vp" headline="VP" />
          <md-select-option value="vu" headline="VU" />
          <md-select-option value="taxi" headline="Taxi" />
        </md-outlined-select>
      </div>

      {/* Executive KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-card-icon primary"><md-icon>donut_large</md-icon></div>
          <div className="md-typescale-headline-small kpi-card-value">98.6%</div>
          <div className="md-typescale-label-medium kpi-card-label">Ratio Combiné 2023</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon secondary"><md-icon>healing</md-icon></div>
          <div className="md-typescale-headline-small kpi-card-value">66.2%</div>
          <div className="md-typescale-label-medium kpi-card-label">Ratio S/P 2023</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon tertiary"><md-icon>description</md-icon></div>
          <div className="md-typescale-headline-small kpi-card-value">94 852</div>
          <div className="md-typescale-label-medium kpi-card-label">Polices en vigueur</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon error"><md-icon>savings</md-icon></div>
          <div className="md-typescale-headline-small kpi-card-value">249 M DT</div>
          <div className="md-typescale-label-medium kpi-card-label">Primes Acquises 2023</div>
        </div>
      </div>

      <div className="two-col-grid">
        {/* RC chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>bar_chart</md-icon>
                Ratio Combiné 2018–2023 (%)
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={execData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 112]} tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ background: 'var(--md-sys-color-surface-container-highest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 8 }} />
              <Bar dataKey="rc" name="Ratio Combiné" radius={[4, 4, 0, 0]}>
                {execData.map((entry, i) => (
                  <Cell key={i} fill={entry.rc > 100 ? CHART_ERROR : CHART_PRIMARY} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}
        <div>
          <div className="chart-card-header" style={{ marginBottom: 12 }}>
            <div className="md-typescale-title-medium chart-card-title">
              <md-icon>notifications_active</md-icon>
              Alertes Automatiques
            </div>
          </div>
          <div className="alert-list">
            {alerts.map((alert, i) => (
              <div key={i} className={`alert-card ${alert.level}`}>
                <md-icon>{alert.icon}</md-icon>
                <div>
                  <div className="md-typescale-label-large" style={{ marginBottom: 2 }}>{alert.message}</div>
                  <div className="md-typescale-body-small" style={{ opacity: 0.8 }}>{alert.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
