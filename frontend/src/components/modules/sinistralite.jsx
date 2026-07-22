'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const CHART_PRIMARY = '#0284c7'
const CHART_SECONDARY = '#0ea5e9'
const CHART_TERTIARY = '#38bdf8'

/* ---- Development triangle data (cumulative amounts in kDT) ---- */
const devTriangle = [
  { survYear: '2018', dev1: 8420, dev2: 14380, dev3: 18650, dev4: 21200, dev5: 22480, dev6: 23140 },
  { survYear: '2019', dev1: 9150, dev2: 15820, dev3: 20410, dev4: 23050, dev5: 24300, dev6: null },
  { survYear: '2020', dev1: 7890, dev2: 13640, dev3: 17920, dev4: 20500, dev5: null, dev6: null },
  { survYear: '2021', dev1: 10230, dev2: 17640, dev3: 22800, dev4: null, dev5: null, dev6: null },
  { survYear: '2022', dev1: 11440, dev2: 19750, dev3: null, dev4: null, dev5: null, dev6: null },
  { survYear: '2023', dev1: 12660, dev2: null, dev3: null, dev4: null, dev5: null, dev6: null },
]

const devHeaders = ['Surv.', 'Dev. 1', 'Dev. 2', 'Dev. 3', 'Dev. 4', 'Dev. 5', 'Dev. 6']
const devKeys = ['dev1', 'dev2', 'dev3', 'dev4', 'dev5', 'dev6'] as const

function getHeatClass(val: number | null): string {
  if (val === null) return ''
  if (val > 22000) return 'cell-heat-5'
  if (val > 18000) return 'cell-heat-4'
  if (val > 14000) return 'cell-heat-3'
  if (val > 10000) return 'cell-heat-2'
  return 'cell-heat-1'
}

/* ---- Amount distribution histogram ---- */
const amountDist = [
  { range: '0–5k', count: 28400 },
  { range: '5–10k', count: 18700 },
  { range: '10–20k', count: 9800 },
  { range: '20–50k', count: 5600 },
  { range: '50–100k', count: 1900 },
  { range: '100k+', count: 599 },
]

/* ---- Heatmap sinistralité ---- */
const heatmapData = [
  { segment: 'VP – Diesel',    p2018: 58.2, p2019: 61.4, p2020: 54.8, p2021: 67.3, p2022: 70.1, p2023: 63.4 },
  { segment: 'VP – Essence',   p2018: 62.1, p2019: 65.0, p2020: 59.2, p2021: 72.4, p2022: 75.6, p2023: 68.2 },
  { segment: 'VU – Diesel',    p2018: 68.4, p2019: 71.2, p2020: 64.5, p2021: 78.3, p2022: 82.1, p2023: 74.8 },
  { segment: 'Taxi',           p2018: 88.3, p2019: 92.5, p2020: 83.1, p2021: 101.4, p2022: 105.2, p2023: 96.3 },
  { segment: 'Moto',           p2018: 72.6, p2019: 76.8, p2020: 69.3, p2021: 83.2, p2022: 87.4, p2023: 79.1 },
]
const hmYears = ['p2018', 'p2019', 'p2020', 'p2021', 'p2022', 'p2023'] as const

function getHeatmapClass(val: number): string {
  if (val > 100) return 'cell-alert'
  if (val > 85) return 'cell-heat-5'
  if (val > 75) return 'cell-heat-4'
  if (val > 65) return 'cell-heat-3'
  if (val > 58) return 'cell-heat-2'
  return 'cell-heat-1'
}

export function SinistraliteModule() {
  return (
    <div>
      {/* KPI cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-card-icon primary"><md-icon>percent</md-icon></div>
          <div className="md-typescale-headline-medium kpi-card-value">8.7%</div>
          <div className="md-typescale-label-large kpi-card-label">Fréquence Moyenne</div>
          <div className="kpi-trend">
            <span className="md-typescale-body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Sinistres / polices exposées</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon secondary"><md-icon>payments</md-icon></div>
          <div className="md-typescale-headline-medium kpi-card-value">3 842 DT</div>
          <div className="md-typescale-label-large kpi-card-label">Coût Moyen Sinistre</div>
          <div className="kpi-trend">
            <md-icon style={{ fontSize: 14, color: 'var(--md-sys-color-error)' }}>trending_up</md-icon>
            <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-error)' }}>+4.8% vs 2022</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon tertiary"><md-icon>emergency</md-icon></div>
          <div className="md-typescale-headline-medium kpi-card-value">18.3% corp.</div>
          <div className="md-typescale-label-large kpi-card-label">Sinistres Corporels vs Matériels</div>
          <div className="kpi-trend">
            <span className="md-typescale-body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>81.7% matériels</span>
          </div>
        </div>
      </div>

      {/* Development triangle */}
      <div className="data-table-card" style={{ marginBottom: 16 }}>
        <div className="chart-card-header" style={{ marginBottom: 12 }}>
          <div>
            <div className="md-typescale-title-medium chart-card-title">
              <md-icon>grid_on</md-icon>
              Triangle de Développement des Sinistres (kDT)
            </div>
            <div className="md-typescale-body-small chart-card-subtitle">Montants cumulés payés par année de survenance et de développement</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              {devHeaders.map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {devTriangle.map((row) => (
              <tr key={row.survYear}>
                <td style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>{row.survYear}</td>
                {devKeys.map((k) => (
                  <td key={k} className={getHeatClass(row[k])}>
                    {row[k] !== null ? row[k]!.toLocaleString('fr-FR') : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="charts-grid">
        {/* Distribution histogram */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>bar_chart</md-icon>
                Distribution des Montants de Sinistres
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Nombre de sinistres par tranche (DT) — 2023</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={amountDist} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} />
              <Tooltip formatter={(v: number) => [v.toLocaleString('fr-FR'), 'Sinistres']} contentStyle={{ background: 'var(--md-sys-color-surface-container-highest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {amountDist.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? CHART_PRIMARY : i === 1 ? CHART_SECONDARY : CHART_TERTIARY} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Heatmap */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>grid_view</md-icon>
                Heatmap Sinistralité par Segment
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Ratio S/P (%) — rouge = dépassement 100%</div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>2018</th><th>2019</th><th>2020</th><th>2021</th><th>2022</th><th>2023</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row) => (
                  <tr key={row.segment}>
                    <td style={{ fontWeight: 600 }}>{row.segment}</td>
                    {hmYears.map((yr) => (
                      <td key={yr} className={getHeatmapClass(row[yr])} style={{ textAlign: 'center' }}>
                        {row[yr]}%
                      </td>
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
