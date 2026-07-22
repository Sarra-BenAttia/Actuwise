'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

const combinedRatioData = [
  { year: '2018', ratio: 92.4, sinistres: 61.2, frais: 31.2 },
  { year: '2019', ratio: 96.1, sinistres: 64.5, frais: 31.6 },
  { year: '2020', ratio: 89.3, sinistres: 58.7, frais: 30.6 },
  { year: '2021', ratio: 101.2, sinistres: 68.9, frais: 32.3 },
  { year: '2022', ratio: 104.8, sinistres: 71.3, frais: 33.5 },
  { year: '2023', ratio: 98.6, sinistres: 66.2, frais: 32.4 },
]

const frequencyData = [
  { segment: '18-25 ans', freq: 12.4 },
  { segment: '26-35 ans', freq: 8.7 },
  { segment: '36-50 ans', freq: 6.3 },
  { segment: '51-65 ans', freq: 5.9 },
  { segment: '65+ ans', freq: 7.1 },
  { segment: 'Tunis', freq: 9.8 },
  { segment: 'Sfax', freq: 7.6 },
  { segment: 'Sousse', freq: 8.2 },
  { segment: 'VP', freq: 7.8 },
  { segment: 'VU', freq: 10.3 },
  { segment: 'Taxi', freq: 15.6 },
]

const CHART_PRIMARY = '#0284c7'
const CHART_SECONDARY = '#0ea5e9'
const CHART_TERTIARY = '#38bdf8'
const CHART_ERROR = '#dc2626'

const CustomTooltipRatio = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--md-sys-color-surface-container-highest)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        borderRadius: 8, padding: '8px 12px',
        color: 'var(--md-sys-color-on-surface)', fontSize: '0.8rem'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{p.name}</span>
            <span style={{ fontWeight: 600 }}>{p.value}%</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const pipelineModules = [
  { id: '0', label: 'Données Brutes', sub: 'Module 0', icon: 'storage', isPrimary: false },
  { id: '1', label: 'Sinistralité', sub: 'Module 1', icon: 'analytics', isPrimary: true },
  { id: '2', label: 'Provisions', sub: 'Module 2', icon: 'account_balance', isPrimary: true },
  { id: '3', label: 'Modélisation', sub: 'Module 3', icon: 'model_training', isPrimary: true },
  { id: '4', label: 'Séries temp.', sub: 'Module 4', icon: 'timeline', isPrimary: true },
  { id: '5', label: 'Reporting', sub: 'Module 5', icon: 'summarize', isPrimary: false },
  { id: '6', label: 'Assistant IA', sub: 'Module 6', icon: 'smart_toy', isPrimary: false },
]

export function OverviewModule() {
  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-icon primary"><md-icon>donut_large</md-icon></div>
          <div className="md-typescale-headline-medium kpi-card-value">
            98.6%
            <span className="kpi-badge alert">
              <md-icon style={{ fontSize: 14 }}>warning</md-icon> Proche 100%
            </span>
          </div>
          <div className="md-typescale-label-large kpi-card-label">Ratio Combiné Global</div>
          <div className="kpi-trend">
            <md-icon style={{ fontSize: 14, color: 'var(--md-sys-color-tertiary)' }}>trending_down</md-icon>
            <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-tertiary)' }}>-6.2 pts vs 2022</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon secondary"><md-icon>healing</md-icon></div>
          <div className="md-typescale-headline-medium kpi-card-value">
            66.2%
            <span className="kpi-badge ok">Normal</span>
          </div>
          <div className="md-typescale-label-large kpi-card-label">Ratio Sinistres (S/P)</div>
          <div className="kpi-trend">
            <md-icon style={{ fontSize: 14, color: 'var(--md-sys-color-tertiary)' }}>trending_down</md-icon>
            <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-tertiary)' }}>-5.1 pts vs 2022</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon tertiary"><md-icon>description</md-icon></div>
          <div className="md-typescale-headline-medium kpi-card-value">94 852</div>
          <div className="md-typescale-label-large kpi-card-label">Nombre de Polices</div>
          <div className="kpi-trend">
            <md-icon style={{ fontSize: 14, color: 'var(--md-sys-color-primary)' }}>trending_up</md-icon>
            <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-primary)' }}>+3.2% vs 2022</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon error"><md-icon>car_crash</md-icon></div>
          <div className="md-typescale-headline-medium kpi-card-value">64 999</div>
          <div className="md-typescale-label-large kpi-card-label">Nombre de Sinistres</div>
          <div className="kpi-trend">
            <md-icon style={{ fontSize: 14, color: 'var(--md-sys-color-tertiary)' }}>trending_down</md-icon>
            <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-tertiary)' }}>-7.3% vs 2022</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Combined ratio evolution */}
        <div className="chart-card full-width">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>show_chart</md-icon>
                Évolution du Ratio Combiné 2018–2023
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Ratio sinistres + frais de gestion (%). Zone rouge = dépassement 100%</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={combinedRatioData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRatio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAlert" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_ERROR} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_ERROR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 115]} tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltipRatio />} />
              <ReferenceLine y={100} stroke={CHART_ERROR} strokeDasharray="6 3" strokeWidth={2} label={{ value: 'Seuil 100%', fill: CHART_ERROR, fontSize: 11 }} />
              <Area type="monotone" dataKey="ratio" name="Ratio Combiné" stroke={CHART_PRIMARY} strokeWidth={2.5} fill="url(#gradRatio)" dot={{ r: 4, fill: CHART_PRIMARY }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Frequency by segment */}
        <div className="chart-card full-width">
          <div className="chart-card-header">
            <div>
              <div className="md-typescale-title-medium chart-card-title">
                <md-icon>bar_chart</md-icon>
                Fréquence de Sinistres par Segment (%)
              </div>
              <div className="md-typescale-body-small chart-card-subtitle">Âge assuré, région et type de véhicule — exercice 2023</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={frequencyData} margin={{ top: 0, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" vertical={false} />
              <XAxis dataKey="segment" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Fréquence']} contentStyle={{ background: 'var(--md-sys-color-surface-container-highest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 8 }} />
              <Bar dataKey="freq" name="Fréquence" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline diagram */}
      <div className="pipeline-card">
        <div className="section-header">
          <div className="md-typescale-title-medium section-header-title">
            <md-icon>account_tree</md-icon>
            Pipeline ACTUWISE — Flux de Modélisation
          </div>
          <div className="md-typescale-body-small section-header-sub">De la donnée brute aux outputs décisionnels</div>
        </div>
        <div className="pipeline-flow">
          {pipelineModules.map((mod, i) => (
            <div key={mod.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div className={`pipeline-node${mod.isPrimary ? ' primary' : ''}`} style={{ minWidth: 90 }}>
                <div className="pipeline-node-icon"><md-icon>{mod.icon}</md-icon></div>
                <span className="md-typescale-label-medium pipeline-node-label">{mod.label}</span>
                <span className="md-typescale-label-small pipeline-node-sub">{mod.sub}</span>
              </div>
              {i < pipelineModules.length - 1 && (
                <div className="pipeline-arrow"><md-icon>chevron_right</md-icon></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
