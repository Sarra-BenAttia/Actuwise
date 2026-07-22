/**
 * ACTUWISE — src/pages/Dashboard.jsx
 * Dashboard actuariel complet — thème dark premium inspiré DeskApp.
 *
 * Structure :
 *  - Sidebar fixe gauche avec 7 sections de navigation
 *  - Zone principale scrollable à droite
 *  - Sections : Vue Générale, Sinistralité, Provisionnement,
 *               Modélisation, Séries Temp., Ratio Combiné, Assistant IA
 *
 * Auteurs   : Équipe ACTUWISE
 * Données   : API FastAPI → /api/*
 */

import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

// --- Composants réutilisables ---
import KPICard from '../components/kpis/KPICard'
import BenchmarkTable from '../components/tables/BenchmarkTable'
import StaticFigure from '../components/images/StaticFigure'

// --- Hooks API ---
import { useAPI, usePost, useExtract } from '../hooks/useAPI'

// --- Services API ---
import {
  getKPIs, getSinistralite,
  getProvisionnementClassique, getProvisionnementML,
  getModelisationBenchmark, getModelisationSHAP, getModelisationSegments,
  getSeriesHistorique, getRatioCombine, askAssistant,
  predictAssure, predictReserving,
  formatNumber, formatTND, formatPct, getFigureUrl,
} from '../services/api'


// ============================================================
// PALETTE DE COULEURS — Thème dark premium ACTUWISE
// ============================================================
const COLORS = {
  bgMain:     '#0f172a',
  bgSidebar:  '#0a0f1e',
  bgCard:     'rgba(15, 23, 42, 0.8)',
  borderCard: 'rgba(51, 65, 85, 0.5)',
  accent:     '#3b82f6',
  green:      '#22c55e',
  red:        '#ef4444',
  orange:     '#f97316',
  purple:     '#a855f7',
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted:     '#64748b',
}

// Couleurs Recharts
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#06b6d4', '#eab308']


// ============================================================
// ITEMS DE LA SIDEBAR
// ============================================================
const SIDEBAR_ITEMS = [
  { key: 'overview',       label: 'Vue Générale',   icon: '📊', badge: null },
  { key: 'sinistralite',   label: 'Sinistralité',   icon: '📈', badge: null },
  { key: 'provisionnement',label: 'Provisionnement',icon: '🛡️', badge: null },
  { key: 'modelisation',   label: 'Modélisation',   icon: '🎯', badge: null },
  { key: 'series',         label: 'Séries Temp.',   icon: '📉', badge: '🔜' },
  { key: 'ratio',          label: 'Ratio Combiné',  icon: '⚖️', badge: null },
  { key: 'assistant',      label: 'Assistant IA',   icon: '🤖', badge: '🔜' },
]


// ============================================================
// COMPOSANT UTILITAIRE — Carte conteneur dark
// ============================================================
function DarkCard({ title, subtitle, children, style = {} }) {
  return (
    <div style={{
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.borderCard}`,
      borderRadius: '12px',
      padding: '24px',
      backdropFilter: 'blur(12px)',
      ...style,
    }}>
      {title && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ color: COLORS.textPrimary, fontSize: '16px', fontWeight: 600, margin: 0 }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ color: COLORS.textSecondary, fontSize: '13px', margin: '4px 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}


// ============================================================
// COMPOSANT UTILITAIRE — Indicateur de chargement
// ============================================================
function LoadingSpinner({ text = 'Chargement...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px' }}>
      <div style={{
        width: '28px', height: '28px', border: `3px solid ${COLORS.borderCard}`,
        borderTop: `3px solid ${COLORS.accent}`, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: COLORS.textSecondary, fontSize: '14px' }}>{text}</span>
    </div>
  )
}


// ============================================================
// COMPOSANT UTILITAIRE — Message d'erreur
// ============================================================
function ErrorMessage({ message }) {
  return (
    <div style={{
      padding: '24px', textAlign: 'center', color: COLORS.red,
      background: 'rgba(239,68,68,0.08)', borderRadius: '8px',
      border: '1px solid rgba(239,68,68,0.2)',
    }}>
      <span style={{ fontSize: '24px' }}>⚠️</span>
      <p style={{ margin: '8px 0 0', fontSize: '14px' }}>{message || 'Erreur de chargement des données'}</p>
    </div>
  )
}


// ============================================================
// COMPOSANT UTILITAIRE — Message "données non disponibles"
// ============================================================
function NoData({ message = 'Données non disponibles' }) {
  return (
    <div style={{
      padding: '40px', textAlign: 'center', color: COLORS.textMuted, fontSize: '14px',
    }}>
      <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📭</span>
      {message}
    </div>
  )
}


// ============================================================
// COMPOSANT UTILITAIRE — Tooltip Recharts personnalisé
// ============================================================
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)', border: `1px solid ${COLORS.borderCard}`,
      borderRadius: '8px', padding: '12px 16px', fontSize: '13px',
    }}>
      <p style={{ color: COLORS.textPrimary, margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name} : <strong>{typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}</strong>
        </p>
      ))}
    </div>
  )
}


// ============================================================
// SECTION 1 — VUE GÉNÉRALE
// ============================================================
function SectionOverview() {
  const { data: kpisData, loading: kpisLoading, error: kpisError } = useAPI(getKPIs)
  const { data: siniData, loading: siniLoading } = useAPI(getSinistralite)

  // Extraction des KPIs depuis la réponse API
  const kpis = useExtract(kpisData, 'kpis', [])

  // Extraction des données mensuelles pour le graphique ratio combiné
  const mensuel = useExtract(siniData, 'mensuel', [])

  return (
    <div>
      {/* Titre de la section */}
      <h2 style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
        📊 Vue Générale du Portefeuille
      </h2>

      {/* 4 KPI Cards */}
      {kpisLoading ? (
        <LoadingSpinner text="Chargement des KPIs..." />
      ) : kpisError ? (
        <ErrorMessage message={kpisError} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {kpis.length > 0 ? kpis.map((kpi, i) => (
            <KPICard
              key={i}
              label={kpi.label || kpi.nom || `KPI ${i + 1}`}
              valeur={kpi.valeur}
              unite={kpi.unite || ''}
              couleur={kpi.couleur || ['blue', 'green', 'orange', 'purple'][i % 4]}
              modele={kpi.modele || null}
              interpretation={kpi.interpretation || null}
              icone={kpi.icone || ['📊', '💰', '📈', '🎯'][i % 4]}
            />
          )) : (
            /* KPIs par défaut si pas de données */
            <>
              <KPICard label="Ratio Combiné" valeur={null} unite="%" couleur="blue" icone="📊" loading={true} />
              <KPICard label="Prime Pure Moy." valeur={null} unite="TND" couleur="green" icone="💰" loading={true} />
              <KPICard label="Fréquence Sinistres" valeur={null} unite="%" couleur="orange" icone="📈" loading={true} />
              <KPICard label="Réserve IBNR" valeur={null} unite="TND" couleur="purple" icone="🎯" loading={true} />
            </>
          )}
        </div>
      )}

      {/* Graphique Ratio Combiné Mensuel */}
      <DarkCard title="Évolution Mensuelle — Ratio Combiné" subtitle="Période 2018-2023 — Données historiques">
        {siniLoading ? (
          <LoadingSpinner text="Chargement du graphique..." />
        ) : mensuel && mensuel.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={mensuel} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="mois" stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} />
              <YAxis stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: COLORS.textSecondary }} />
              <ReferenceLine y={100} stroke={COLORS.red} strokeDasharray="5 5" label={{ value: '100%', fill: COLORS.red, fontSize: 11 }} />
              <Line type="monotone" dataKey="ratio_combine" name="Ratio Combiné (%)" stroke={COLORS.accent} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ratio_sinistres" name="Ratio Sinistres (%)" stroke={COLORS.orange} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </DarkCard>
    </div>
  )
}


// ============================================================
// SECTION 2 — SINISTRALITÉ (MODULE 1)
// ============================================================
function SectionSinistralite() {
  const { data: siniData, loading, error } = useAPI(getSinistralite)

  // Extraction des données
  const mensuel = useExtract(siniData, 'mensuel', [])
  const parGarantie = useExtract(siniData, 'par_garantie', [])
  const parAnnee = useExtract(siniData, 'par_annee', [])

  if (loading) return <LoadingSpinner text="Chargement des données de sinistralité..." />
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <h2 style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
        📈 Module 1 — Analyse de la Sinistralité
      </h2>

      {/* Graphique : Nombre de sinistres mensuel */}
      <DarkCard title="Évolution Mensuelle des Sinistres" subtitle="Nombre de sinistres déclarés par mois" style={{ marginBottom: '20px' }}>
        {mensuel && mensuel.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={mensuel} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="mois" stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} />
              <YAxis stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="nb_sinistres" name="Nb Sinistres" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </DarkCard>

      {/* Graphique : Coût total par garantie */}
      <DarkCard title="Coût Total par Garantie" subtitle="Répartition des charges sinistres par type de garantie" style={{ marginBottom: '20px' }}>
        {parGarantie && parGarantie.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={parGarantie} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="garantie" stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cout_total" name="Coût Total (TND)" radius={[4, 4, 0, 0]}>
                {parGarantie.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </DarkCard>

      {/* Tableau : Sinistralité par garantie */}
      <DarkCard title="Tableau Récapitulatif — Sinistralité par Garantie" subtitle="Indicateurs clés par type de garantie">
        {parGarantie && parGarantie.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.borderCard}` }}>
                  {Object.keys(parGarantie[0]).map(key => (
                    <th key={key} style={{
                      padding: '12px 14px', textAlign: 'left', color: COLORS.textSecondary,
                      fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parGarantie.map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: `1px solid rgba(51,65,85,0.2)`,
                    background: i % 2 === 0 ? 'rgba(30,41,59,0.4)' : 'transparent',
                  }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ padding: '10px 14px', color: COLORS.textPrimary, fontSize: '13px' }}>
                        {typeof val === 'number' ? val.toLocaleString('fr-FR') : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData />
        )}
      </DarkCard>
    </div>
  )
}


// ============================================================
// SECTION 3 — PROVISIONNEMENT (MODULE 2)
// ============================================================
function SectionProvisionnement() {
  const { data: classData, loading: classLoading, error: classError } = useAPI(getProvisionnementClassique)
  const { data: mlData, loading: mlLoading, error: mlError } = useAPI(getProvisionnementML)

  // --- Formulaire Prédiction Réserves ---
  const { execute: execReserving, data: reservResult, loading: reservLoading, error: reservError } = usePost(predictReserving)
  const [triangleInput, setTriangleInput] = useState('')

  const handleReservingSubmit = useCallback(async (e) => {
    e.preventDefault()
    try {
      const parsed = JSON.parse(triangleInput)
      await execReserving(parsed)
    } catch {
      alert('JSON invalide. Vérifiez le format du triangle.')
    }
  }, [triangleInput, execReserving])

  // Extraction données classiques
  const triangleFigure = useExtract(classData, 'triangle_figure', null)
  const methodes = useExtract(classData, 'methodes', [])
  const ibnrData = useExtract(classData, 'ibnr', [])
  const stressTests = useExtract(classData, 'stress_tests', null)

  // Extraction données ML
  const modeleRetenuML = useExtract(mlData, 'modele_retenu', null)
  const reserveFinale = useExtract(mlData, 'reserve_finale', null)
  const tornadoFigure = useExtract(mlData, 'tornado_figure', null)
  const benchmarkML = useExtract(mlData, 'benchmark', [])

  return (
    <div>
      <h2 style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
        🛡️ Module 2 — Provisionnement & Réserves
      </h2>

      {/* ---- 3a — Méthodes classiques ---- */}
      <h3 style={{ color: COLORS.accent, fontSize: '16px', fontWeight: 600, marginBottom: '16px', borderLeft: `3px solid ${COLORS.accent}`, paddingLeft: '12px' }}>
        3a — Méthodes Classiques (CL, BF, Cape Cod)
      </h3>

      {classLoading ? <LoadingSpinner text="Chargement provisionnement classique..." /> : classError ? <ErrorMessage message={classError} /> : (
        <>
          {/* Heatmap triangle */}
          <DarkCard title="Triangle de Développement — Heatmap" style={{ marginBottom: '20px' }}>
            <StaticFigure
              src={triangleFigure ? getFigureUrl(triangleFigure) : null}
              alt="Heatmap du triangle de développement"
              caption="Triangle de liquidation cumulé — coloré par intensité"
            />
          </DarkCard>

          {/* Tableau comparatif des méthodes */}
          <DarkCard title="Comparaison des Méthodes de Provisionnement" subtitle="Chain-Ladder vs Bornhuetter-Ferguson vs Cape Cod vs XGBoost" style={{ marginBottom: '20px' }}>
            {methodes && methodes.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.borderCard}` }}>
                      {Object.keys(methodes[0]).map(key => (
                        <th key={key} style={{
                          padding: '12px 14px', textAlign: 'left', color: COLORS.textSecondary,
                          fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {methodes.map((row, i) => (
                      <tr key={i} style={{
                        borderBottom: `1px solid rgba(51,65,85,0.2)`,
                        background: i % 2 === 0 ? 'rgba(30,41,59,0.4)' : 'transparent',
                      }}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{ padding: '10px 14px', color: COLORS.textPrimary, fontSize: '13px' }}>
                            {typeof val === 'number' ? val.toLocaleString('fr-FR') : val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoData message="Données des méthodes non disponibles" />
            )}
          </DarkCard>

          {/* BarChart IBNR */}
          <DarkCard title="Réserves IBNR par Année de Survenance" subtitle="Incurred But Not Reported" style={{ marginBottom: '20px' }}>
            {ibnrData && ibnrData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ibnrData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                  <XAxis dataKey="annee" stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} />
                  <YAxis stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ibnr" name="IBNR (TND)" fill={COLORS.accent} radius={[4, 4, 0, 0]}>
                    {ibnrData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData message="Données IBNR non disponibles" />
            )}
          </DarkCard>
        </>
      )}

      {/* ---- 3b — ML Reserving ---- */}
      <h3 style={{ color: COLORS.green, fontSize: '16px', fontWeight: 600, margin: '32px 0 16px', borderLeft: `3px solid ${COLORS.green}`, paddingLeft: '12px' }}>
        3b — ML Reserving (XGBoost)
      </h3>

      {mlLoading ? <LoadingSpinner text="Chargement ML Reserving..." /> : mlError ? <ErrorMessage message={mlError} /> : (
        <>
          {/* Modèle retenu + Réserve finale */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <DarkCard title="Modèle Retenu">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 700,
                  background: 'rgba(34,197,94,0.15)', color: COLORS.green,
                  border: `1px solid rgba(34,197,94,0.3)`,
                }}>
                  ✅ {modeleRetenuML || 'XGBoost'}
                </span>
              </div>
            </DarkCard>
            <DarkCard title="Réserve Finale Estimée">
              <span style={{ fontSize: '28px', fontWeight: 700, color: COLORS.accent }}>
                {reserveFinale ? formatTND(reserveFinale) : '—'}
              </span>
            </DarkCard>
          </div>

          {/* Tornado chart */}
          <DarkCard title="Tornado Chart — Sensibilité des Réserves" style={{ marginBottom: '20px' }}>
            <StaticFigure
              src={tornadoFigure ? getFigureUrl(tornadoFigure) : null}
              alt="Tornado chart des réserves ML"
              caption="Impact de chaque variable sur la réserve estimée"
            />
          </DarkCard>
        </>
      )}

      {/* ---- Formulaire Prédiction Réserves ---- */}
      <DarkCard title="🔮 Prédiction de Réserves — Triangle Personnalisé" subtitle="Entrez un triangle de développement au format JSON pour obtenir une estimation">
        <form onSubmit={handleReservingSubmit}>
          <textarea
            value={triangleInput}
            onChange={(e) => setTriangleInput(e.target.value)}
            placeholder={`{\n  "triangle_data": [\n    [100, 150, 180, 200],\n    [110, 160, 190, null],\n    [120, 170, null, null],\n    [130, null, null, null]\n  ],\n  "annees_survenance": [2020, 2021, 2022, 2023]\n}`}
            style={{
              width: '100%', minHeight: '160px', padding: '14px',
              background: 'rgba(30,41,59,0.6)', border: `1px solid ${COLORS.borderCard}`,
              borderRadius: '8px', color: COLORS.textPrimary, fontSize: '13px',
              fontFamily: 'monospace', resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={reservLoading || !triangleInput.trim()}
            style={{
              marginTop: '12px', padding: '10px 28px', borderRadius: '8px',
              background: reservLoading ? COLORS.textMuted : COLORS.accent,
              color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px',
              cursor: reservLoading ? 'wait' : 'pointer', transition: 'background 0.2s',
            }}
          >
            {reservLoading ? '⏳ Calcul en cours...' : '🚀 Estimer les Réserves'}
          </button>
        </form>

        {/* Résultat de la prédiction */}
        {reservError && <ErrorMessage message={reservError} />}
        {reservResult && reservResult.status === 'ok' && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
            <h4 style={{ color: COLORS.green, margin: '0 0 12px', fontSize: '15px' }}>✅ Résultat de la Prédiction</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {reservResult.data && Object.entries(reservResult.data).map(([key, val]) => (
                <div key={key} style={{ padding: '12px', background: 'rgba(15,23,42,0.6)', borderRadius: '8px' }}>
                  <span style={{ color: COLORS.textSecondary, fontSize: '11px', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</span>
                  <p style={{ color: COLORS.textPrimary, fontSize: '18px', fontWeight: 600, margin: '4px 0 0' }}>
                    {typeof val === 'number' ? val.toLocaleString('fr-FR') : JSON.stringify(val)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DarkCard>
    </div>
  )
}


// ============================================================
// SECTION 4 — MODÉLISATION DES RISQUES (MODULE 3)
// ============================================================
function SectionModelisation() {
  const { data: benchData, loading: benchLoading, error: benchError } = useAPI(getModelisationBenchmark)
  const { data: shapData, loading: shapLoading } = useAPI(getModelisationSHAP)
  const { data: segData, loading: segLoading } = useAPI(getModelisationSegments)

  // --- Formulaire Prédiction Assuré ---
  const { execute: execAssure, data: assureResult, loading: assureLoading, error: assureError } = usePost(predictAssure)
  const [assureForm, setAssureForm] = useState({
    age_conducteur: 35,
    classe_bm: 10,
    puissance_fiscale: 7,
    region: 'Tunis',
    usage: 'Promenade',
    energie: 'Essence',
    anciennete_vehicule: 3,
  })

  const handleAssureChange = useCallback((field, value) => {
    setAssureForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleAssureSubmit = useCallback(async (e) => {
    e.preventDefault()
    await execAssure(assureForm)
  }, [assureForm, execAssure])

  // Extraction benchmark
  const benchRows = useExtract(benchData, 'benchmark', [])
  const modeleRetenu = useExtract(benchData, 'modele_retenu', null)
  const lorenzFigure = useExtract(benchData, 'lorenz_figure', null)

  // Extraction SHAP
  const shapFigures = useExtract(shapData, 'figures', [])
  const shapTop10 = useExtract(shapData, 'top_features', [])

  // Extraction segments
  const segments = useExtract(segData, 'segments', [])
  const clusters = useExtract(segData, 'clusters', null)

  // Champs du formulaire assuré
  const FORM_FIELDS = [
    { key: 'age_conducteur', label: 'Âge du conducteur', type: 'number', min: 18, max: 90 },
    { key: 'classe_bm', label: 'Classe Bonus-Malus', type: 'number', min: 0, max: 22 },
    { key: 'puissance_fiscale', label: 'Puissance fiscale (CV)', type: 'number', min: 1, max: 30 },
    { key: 'region', label: 'Région', type: 'select', options: ['Tunis', 'Sfax', 'Sousse', 'Nabeul', 'Bizerte', 'Gabès', 'Kairouan', 'Ariana', 'Monastir', 'Ben Arous', 'Manouba', 'Médenine', 'Autre'] },
    { key: 'usage', label: 'Usage du véhicule', type: 'select', options: ['Promenade', 'Trajet travail', 'Professionnel', 'Transport'] },
    { key: 'energie', label: 'Énergie', type: 'select', options: ['Essence', 'Diesel', 'GPL', 'Hybride', 'Électrique'] },
    { key: 'anciennete_vehicule', label: 'Ancienneté véhicule (ans)', type: 'number', min: 0, max: 40 },
  ]

  return (
    <div>
      <h2 style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
        🎯 Module 3 — Modélisation des Risques
      </h2>

      {/* ---- 4a — Benchmark ---- */}
      <h3 style={{ color: COLORS.accent, fontSize: '16px', fontWeight: 600, marginBottom: '16px', borderLeft: `3px solid ${COLORS.accent}`, paddingLeft: '12px' }}>
        4a — Benchmark des Modèles (GLM / XGBoost / CANN)
      </h3>

      {benchLoading ? <LoadingSpinner text="Chargement du benchmark..." /> : benchError ? <ErrorMessage message={benchError} /> : (
        <>
          {/* Modèle retenu badge */}
          {modeleRetenu && (
            <div style={{ marginBottom: '16px' }}>
              <span style={{
                padding: '8px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 700,
                background: 'rgba(59,130,246,0.15)', color: COLORS.accent,
                border: `1px solid rgba(59,130,246,0.3)`,
              }}>
                🏆 Modèle retenu : {modeleRetenu}
              </span>
            </div>
          )}

          {/* Tableau BenchmarkTable */}
          <DarkCard title="Tableau Comparatif des Performances" style={{ marginBottom: '20px' }}>
            <BenchmarkTable rows={benchRows} modeleRetenu={modeleRetenu} />
          </DarkCard>

          {/* Courbe de Lorenz */}
          <DarkCard title="Courbe de Lorenz — Pouvoir Discriminant" subtitle="Courbe de concentration des sinistres" style={{ marginBottom: '20px' }}>
            <StaticFigure
              src={lorenzFigure ? getFigureUrl(lorenzFigure) : null}
              alt="Courbe de Lorenz"
              caption="Plus la courbe s'éloigne de la diagonale, meilleur est le pouvoir discriminant du modèle"
            />
          </DarkCard>
        </>
      )}

      {/* ---- 4b — SHAP ---- */}
      <h3 style={{ color: COLORS.purple, fontSize: '16px', fontWeight: 600, margin: '32px 0 16px', borderLeft: `3px solid ${COLORS.purple}`, paddingLeft: '12px' }}>
        4b — Interprétabilité SHAP
      </h3>

      {shapLoading ? <LoadingSpinner text="Chargement SHAP..." /> : (
        <>
          {/* Figures SHAP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {shapFigures && shapFigures.length > 0 ? shapFigures.map((fig, i) => (
              <DarkCard key={i} title={fig.titre || `SHAP Figure ${i + 1}`}>
                <StaticFigure
                  src={getFigureUrl(fig.fichier || fig)}
                  alt={fig.titre || `SHAP Figure ${i + 1}`}
                  caption={fig.description || null}
                />
              </DarkCard>
            )) : (
              <DarkCard title="Figures SHAP">
                <NoData message="Figures SHAP non disponibles" />
              </DarkCard>
            )}
          </div>

          {/* Top 10 features */}
          <DarkCard title="Top 10 Variables les Plus Influentes" subtitle="Importance SHAP moyenne absolue" style={{ marginBottom: '20px' }}>
            {shapTop10 && shapTop10.length > 0 ? (
              <div>
                {shapTop10.map((feat, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0',
                    borderBottom: i < shapTop10.length - 1 ? `1px solid rgba(51,65,85,0.2)` : 'none',
                  }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: CHART_COLORS[i % CHART_COLORS.length] + '30',
                      color: CHART_COLORS[i % CHART_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ color: COLORS.textPrimary, fontSize: '14px', flex: 1 }}>
                      {feat.variable || feat.feature || feat}
                    </span>
                    {feat.importance !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(51,65,85,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, (feat.importance / (shapTop10[0]?.importance || 1)) * 100)}%`,
                            height: '100%', background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: '3px',
                          }} />
                        </div>
                        <span style={{ color: COLORS.textSecondary, fontSize: '12px', fontWeight: 600, minWidth: '45px', textAlign: 'right' }}>
                          {typeof feat.importance === 'number' ? feat.importance.toFixed(4) : feat.importance}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <NoData message="Top features non disponibles" />
            )}
          </DarkCard>
        </>
      )}

      {/* ---- 4c — Segmentation ---- */}
      <h3 style={{ color: COLORS.orange, fontSize: '16px', fontWeight: 600, margin: '32px 0 16px', borderLeft: `3px solid ${COLORS.orange}`, paddingLeft: '12px' }}>
        4c — Segmentation & Ratio Combiné par Segment
      </h3>

      {segLoading ? <LoadingSpinner text="Chargement de la segmentation..." /> : (
        <>
          {/* Tableau segments avec badge couleur */}
          <DarkCard title="Ratio Combiné par Segment" subtitle="Segments avec ratio > 100% signalés en rouge" style={{ marginBottom: '20px' }}>
            {segments && segments.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.borderCard}` }}>
                      <th style={{ ...thStyle }}>Segment</th>
                      <th style={{ ...thStyle }}>Ratio Combiné (%)</th>
                      <th style={{ ...thStyle }}>Nb Polices</th>
                      <th style={{ ...thStyle }}>Prime Moy.</th>
                      <th style={{ ...thStyle }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((seg, i) => {
                      const ratio = seg.ratio_combine ?? seg.ratio ?? 0
                      const isDanger = ratio > 100
                      return (
                        <tr key={i} style={{
                          borderBottom: `1px solid rgba(51,65,85,0.2)`,
                          background: isDanger ? 'rgba(239,68,68,0.06)' : (i % 2 === 0 ? 'rgba(30,41,59,0.4)' : 'transparent'),
                        }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{seg.segment || seg.nom || `Segment ${i + 1}`}</td>
                          <td style={{ ...tdStyle, color: isDanger ? COLORS.red : COLORS.green, fontWeight: 700 }}>
                            {formatPct(ratio)}
                          </td>
                          <td style={tdStyle}>{seg.nb_polices ? formatNumber(seg.nb_polices) : '—'}</td>
                          <td style={tdStyle}>{seg.prime_moyenne ? formatTND(seg.prime_moyenne) : '—'}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                              background: isDanger ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                              color: isDanger ? COLORS.red : COLORS.green,
                              border: `1px solid ${isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                            }}>
                              {isDanger ? '⚠️ Déficitaire' : '✅ Rentable'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoData message="Données de segmentation non disponibles" />
            )}
          </DarkCard>

          {/* Clusters K-Means */}
          {clusters && (
            <DarkCard title="Clusters K-Means" subtitle="Segmentation automatique par clustering" style={{ marginBottom: '20px' }}>
              <StaticFigure
                src={typeof clusters === 'string' ? getFigureUrl(clusters) : (clusters.figure ? getFigureUrl(clusters.figure) : null)}
                alt="Clusters K-Means"
                caption="Visualisation des clusters de risques par K-Means"
              />
            </DarkCard>
          )}
        </>
      )}

      {/* ---- Formulaire Prédiction Assuré ---- */}
      <DarkCard
        title="🔮 Prédiction de Prime Pure — Profil Assuré"
        subtitle="Renseignez les caractéristiques du conducteur et du véhicule"
        style={{ marginTop: '24px' }}
      >
        <form onSubmit={handleAssureSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {FORM_FIELDS.map((field) => (
              <div key={field.key}>
                <label style={{ display: 'block', color: COLORS.textSecondary, fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={assureForm[field.key]}
                    onChange={(e) => handleAssureChange(field.key, e.target.value)}
                    style={inputStyle}
                  >
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={assureForm[field.key]}
                    onChange={(e) => handleAssureChange(field.key, Number(e.target.value))}
                    min={field.min}
                    max={field.max}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={assureLoading}
            style={{
              marginTop: '20px', padding: '12px 32px', borderRadius: '8px',
              background: assureLoading ? COLORS.textMuted : COLORS.accent,
              color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px',
              cursor: assureLoading ? 'wait' : 'pointer', transition: 'background 0.2s',
            }}
          >
            {assureLoading ? '⏳ Calcul en cours...' : '🚀 Prédire la Prime Pure'}
          </button>
        </form>

        {/* Résultat prédiction assuré */}
        {assureError && <div style={{ marginTop: '16px' }}><ErrorMessage message={assureError} /></div>}
        {assureResult && assureResult.status === 'ok' && assureResult.data && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h4 style={{ color: COLORS.accent, margin: '0 0 12px', fontSize: '15px' }}>✅ Résultat de la Prédiction</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {Object.entries(assureResult.data).map(([key, val]) => (
                <div key={key} style={{ padding: '12px', background: 'rgba(15,23,42,0.6)', borderRadius: '8px' }}>
                  <span style={{ color: COLORS.textSecondary, fontSize: '11px', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</span>
                  <p style={{ color: key.includes('prime') ? COLORS.accent : COLORS.textPrimary, fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>
                    {typeof val === 'number' ? formatTND(val) : String(val)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DarkCard>
    </div>
  )
}


// ============================================================
// SECTION 5 — SÉRIES TEMPORELLES (PLACEHOLDER)
// ============================================================
function SectionSeries() {
  const { data: seriesData, loading } = useAPI(getSeriesHistorique)

  const isNotImplemented = seriesData?.status === 'not_implemented'

  return (
    <div>
      <h2 style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
        📉 Module 4 — Séries Temporelles
      </h2>

      <DarkCard style={{ textAlign: 'center', padding: '60px 40px' }}>
        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🔜</span>
        <h3 style={{ color: COLORS.textPrimary, fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>
          Module en cours de développement
        </h3>
        <p style={{ color: COLORS.textSecondary, fontSize: '15px', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.7 }}>
          Ce module intégrera l'analyse des séries temporelles pour la prévision de la sinistralité :
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px', maxWidth: '600px', margin: '0 auto',
        }}>
          {[
            { icon: '📊', label: 'Décomposition STL' },
            { icon: '📈', label: 'ARIMA / SARIMA' },
            { icon: '🤖', label: 'Prophet (Facebook)' },
            { icon: '⚡', label: 'LSTM / Transformers' },
            { icon: '🎯', label: 'Prévisions 2024' },
            { icon: '📉', label: 'Intervalles de confiance' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '14px', background: 'rgba(30,41,59,0.5)', borderRadius: '8px',
              border: `1px solid ${COLORS.borderCard}`, display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ color: COLORS.textSecondary, fontSize: '13px' }}>{item.label}</span>
            </div>
          ))}
        </div>
        {isNotImplemented && (
          <p style={{ color: COLORS.textMuted, fontSize: '12px', marginTop: '20px', fontStyle: 'italic' }}>
            {seriesData?.message || 'Endpoint non implémenté — données simulées à venir'}
          </p>
        )}
      </DarkCard>
    </div>
  )
}


// ============================================================
// SECTION 6 — RATIO COMBINÉ
// ============================================================
function SectionRatioCombine() {
  const { data: ratioData, loading, error } = useAPI(getRatioCombine)

  // Extraction des données
  const mensuel = useExtract(ratioData, 'mensuel', [])
  const parSegment = useExtract(ratioData, 'par_segment', [])
  const resume = useExtract(ratioData, 'resume', null)
  const annuel = useExtract(ratioData, 'annuel', [])

  // Tri des segments décroissant par ratio combiné
  const segmentsTries = [...(parSegment || [])].sort((a, b) => (b.ratio_combine ?? b.ratio ?? 0) - (a.ratio_combine ?? a.ratio ?? 0))

  if (loading) return <LoadingSpinner text="Chargement du ratio combiné..." />
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <h2 style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
        ⚖️ Ratio Combiné — Vue Consolidée
      </h2>

      {/* ComposedChart : Bar ratio sinistres + Line ratio combiné */}
      <DarkCard title="Ratio Combiné & Ratio Sinistres par Année" subtitle="La ligne rouge à 100% marque le seuil de rentabilité" style={{ marginBottom: '20px' }}>
        {(annuel && annuel.length > 0) || (mensuel && mensuel.length > 0) ? (
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={annuel.length > 0 ? annuel : mensuel} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey={annuel.length > 0 ? 'annee' : 'mois'} stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} />
              <YAxis stroke={COLORS.textSecondary} tick={{ fontSize: 11 }} domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine y={100} stroke={COLORS.red} strokeDasharray="5 5" label={{ value: 'Seuil 100%', fill: COLORS.red, fontSize: 11 }} />
              <Bar dataKey="ratio_sinistres" name="Ratio Sinistres (%)" fill={COLORS.accent} opacity={0.7} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="ratio_combine" name="Ratio Combiné (%)" stroke={COLORS.orange} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.orange }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </DarkCard>

      {/* Tableau segments triés décroissant */}
      <DarkCard title="Classement des Segments par Ratio Combiné" subtitle="Trié du plus déficitaire au plus rentable" style={{ marginBottom: '20px' }}>
        {segmentsTries.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.borderCard}` }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Segment</th>
                  <th style={thStyle}>Ratio Combiné</th>
                  <th style={thStyle}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {segmentsTries.map((seg, i) => {
                  const ratio = seg.ratio_combine ?? seg.ratio ?? 0
                  const isDanger = ratio > 100
                  return (
                    <tr key={i} style={{
                      borderBottom: `1px solid rgba(51,65,85,0.2)`,
                      background: isDanger ? 'rgba(239,68,68,0.05)' : (i % 2 === 0 ? 'rgba(30,41,59,0.4)' : 'transparent'),
                    }}>
                      <td style={{ ...tdStyle, color: COLORS.textMuted, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{seg.segment || seg.nom || `Segment ${i + 1}`}</td>
                      <td style={{ ...tdStyle, color: isDanger ? COLORS.red : COLORS.green, fontWeight: 700, fontSize: '15px' }}>
                        {formatPct(ratio)}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                          background: isDanger ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                          color: isDanger ? COLORS.red : COLORS.green,
                        }}>
                          {isDanger ? '⚠️ Déficitaire' : '✅ Rentable'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData message="Données par segment non disponibles" />
        )}
      </DarkCard>

      {/* Résumé exécutif */}
      <DarkCard title="📋 Résumé Exécutif" style={{ borderLeft: `4px solid ${COLORS.accent}` }}>
        {resume ? (
          <div style={{ color: COLORS.textPrimary, fontSize: '14px', lineHeight: 1.8 }}>
            {typeof resume === 'string' ? (
              <p style={{ margin: 0 }}>{resume}</p>
            ) : (
              Object.entries(resume).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: COLORS.textSecondary, fontWeight: 600, minWidth: '180px' }}>{key.replace(/_/g, ' ')} :</span>
                  <span>{typeof val === 'number' ? val.toLocaleString('fr-FR') : String(val)}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <p style={{ color: COLORS.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.8 }}>
            Le ratio combiné global mesure la rentabilité technique du portefeuille.
            Un ratio supérieur à 100% indique que les charges (sinistres + frais) dépassent les primes encaissées.
            L'analyse par segment permet d'identifier les niches déficitaires nécessitant un ajustement tarifaire.
          </p>
        )}
      </DarkCard>
    </div>
  )
}


// ============================================================
// SECTION 7 — ASSISTANT IA (PLACEHOLDER)
// ============================================================
function SectionAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Bonjour ! Je suis l\'assistant IA ACTUWISE. Ce module est en cours de développement. Bientôt, je pourrai répondre à vos questions actuarielles en temps réel.' },
  ])
  const [inputMsg, setInputMsg] = useState('')
  const { execute: execQuestion, loading: askLoading } = usePost(askAssistant)

  // Questions suggérées
  const SUGGESTED_QUESTIONS = [
    'Quel est le ratio combiné du portefeuille ?',
    'Quels segments sont déficitaires ?',
    'Quelle est la réserve IBNR totale ?',
    'Quel modèle de tarification est le plus performant ?',
    'Comment évolue la sinistralité en 2023 ?',
  ]

  const handleSend = useCallback(async (question) => {
    const q = question || inputMsg.trim()
    if (!q) return

    // Ajouter le message utilisateur
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setInputMsg('')

    // Appel API
    const { data, error } = await execQuestion(q)

    if (error || data?.status === 'not_implemented') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🔜 Ce module est en cours de développement. L\'assistant IA sera bientôt disponible pour répondre à vos questions actuarielles en langage naturel.',
      }])
    } else if (data?.data?.reponse) {
      setMessages(prev => [...prev, { role: 'assistant', content: data.data.reponse }])
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: '🔜 Fonctionnalité en cours d\'implémentation.' }])
    }
  }, [inputMsg, execQuestion])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div>
      <h2 style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
        🤖 Assistant IA — Actuaire Virtuel
      </h2>

      <DarkCard style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', maxHeight: '700px', padding: 0, overflow: 'hidden' }}>
        {/* Badge placeholder */}
        <div style={{
          padding: '12px 20px', background: 'rgba(249,115,22,0.08)',
          borderBottom: `1px solid ${COLORS.borderCard}`, display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            background: 'rgba(249,115,22,0.15)', color: COLORS.orange, border: '1px solid rgba(249,115,22,0.3)',
          }}>
            🔜 Preview
          </span>
          <span style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
            Module en cours de développement — réponses simulées
          </span>
        </div>

        {/* Zone des messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '75%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', lineHeight: 1.6,
                background: msg.role === 'user'
                  ? 'rgba(59,130,246,0.2)'
                  : 'rgba(30,41,59,0.6)',
                color: COLORS.textPrimary,
                border: msg.role === 'user'
                  ? '1px solid rgba(59,130,246,0.3)'
                  : `1px solid ${COLORS.borderCard}`,
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                borderBottomLeftRadius: msg.role === 'user' ? '12px' : '4px',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {askLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 16px', borderRadius: '12px',
                background: 'rgba(30,41,59,0.6)', border: `1px solid ${COLORS.borderCard}`,
                color: COLORS.textSecondary, fontSize: '14px',
              }}>
                ⏳ Réflexion en cours...
              </div>
            </div>
          )}
        </div>

        {/* Questions suggérées */}
        <div style={{
          padding: '10px 20px', borderTop: `1px solid ${COLORS.borderCard}`,
          display: 'flex', flexWrap: 'wrap', gap: '6px',
        }}>
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              disabled={askLoading}
              style={{
                padding: '5px 12px', borderRadius: '16px', fontSize: '12px',
                background: 'rgba(59,130,246,0.08)', color: COLORS.accent,
                border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Zone de saisie */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${COLORS.borderCard}`,
          display: 'flex', gap: '10px', alignItems: 'center',
        }}>
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question actuarielle..."
            disabled={askLoading}
            style={{
              flex: 1, padding: '10px 16px',
              background: 'rgba(30,41,59,0.6)', border: `1px solid ${COLORS.borderCard}`,
              borderRadius: '8px', color: COLORS.textPrimary, fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={askLoading || !inputMsg.trim()}
            style={{
              padding: '10px 20px', borderRadius: '8px',
              background: askLoading || !inputMsg.trim() ? COLORS.textMuted : COLORS.accent,
              color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer',
              fontSize: '14px', transition: 'background 0.2s',
            }}
          >
            {askLoading ? '⏳' : '📤 Envoyer'}
          </button>
        </div>
      </DarkCard>
    </div>
  )
}


// ============================================================
// STYLES PARTAGÉS — Tableau
// ============================================================
const thStyle = {
  padding: '12px 14px', textAlign: 'left', color: COLORS.textSecondary,
  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
}

const tdStyle = {
  padding: '10px 14px', color: COLORS.textPrimary, fontSize: '13px',
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(30,41,59,0.6)', border: `1px solid ${COLORS.borderCard}`,
  borderRadius: '8px', color: COLORS.textPrimary, fontSize: '14px',
  outline: 'none', boxSizing: 'border-box',
}


// ============================================================
// COMPOSANT PRINCIPAL — DASHBOARD
// ============================================================
function Dashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Rendu de la section active
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':        return <SectionOverview />
      case 'sinistralite':    return <SectionSinistralite />
      case 'provisionnement': return <SectionProvisionnement />
      case 'modelisation':    return <SectionModelisation />
      case 'series':          return <SectionSeries />
      case 'ratio':           return <SectionRatioCombine />
      case 'assistant':       return <SectionAssistant />
      default:                return <SectionOverview />
    }
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: COLORS.bgMain,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* ====== CSS Animations ====== */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.5); }
        ::-webkit-scrollbar-thumb { background: rgba(51,65,85,0.6); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(71,85,105,0.8); }
        select, input[type="number"] { appearance: none; -webkit-appearance: none; }
        select:focus, input:focus, textarea:focus { border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
        select option { background: #1e293b; color: #f1f5f9; }
      `}</style>

      {/* ====== SIDEBAR GAUCHE ====== */}
      <aside style={{
        width: sidebarCollapsed ? '70px' : '260px',
        minHeight: '100vh',
        background: COLORS.bgSidebar,
        borderRight: `1px solid ${COLORS.borderCard}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 100, transition: 'width 0.25s ease', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? '20px 10px' : '20px 20px',
          borderBottom: `1px solid ${COLORS.borderCard}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {!sidebarCollapsed && (
            <div>
              <h1 style={{ color: COLORS.textPrimary, fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                <span style={{ color: COLORS.accent }}>ACTU</span>WISE
              </h1>
              <p style={{ color: COLORS.textMuted, fontSize: '11px', margin: '2px 0 0' }}>Plateforme Actuarielle</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            style={{
              background: 'rgba(51,65,85,0.3)', border: 'none', color: COLORS.textSecondary,
              cursor: 'pointer', borderRadius: '6px', padding: '6px 8px', fontSize: '14px',
            }}
            title={sidebarCollapsed ? 'Développer' : 'Réduire'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Navigation items */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeSection === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: sidebarCollapsed ? '12px 0' : '12px 16px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  marginBottom: '4px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                  background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${COLORS.accent}` : '3px solid transparent',
                  transition: 'all 0.15s ease', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span style={{
                        fontSize: '10px', padding: '2px 6px', borderRadius: '10px',
                        background: 'rgba(249,115,22,0.15)', color: COLORS.orange,
                        border: '1px solid rgba(249,115,22,0.3)', fontWeight: 600,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer sidebar */}
        <div style={{ padding: '12px', borderTop: `1px solid ${COLORS.borderCard}` }}>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              padding: '10px 16px', borderRadius: '8px',
              background: 'rgba(51,65,85,0.2)', border: `1px solid ${COLORS.borderCard}`,
              color: COLORS.textSecondary, cursor: 'pointer', fontSize: '13px',
              transition: 'all 0.15s',
            }}
            title="Retour à l'accueil"
          >
            <span style={{ fontSize: '16px' }}>🏠</span>
            {!sidebarCollapsed && <span>Retour Accueil</span>}
          </button>
        </div>
      </aside>

      {/* ====== ZONE PRINCIPALE ====== */}
      <main style={{
        flex: 1,
        marginLeft: sidebarCollapsed ? '70px' : '260px',
        transition: 'margin-left 0.25s ease',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header principal */}
        <header style={{
          padding: '16px 32px',
          borderBottom: `1px solid ${COLORS.borderCard}`,
          background: 'rgba(10,15,30,0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ color: COLORS.textPrimary, fontSize: '17px', fontWeight: 600, margin: 0 }}>
              {SIDEBAR_ITEMS.find(s => s.key === activeSection)?.icon}{' '}
              {SIDEBAR_ITEMS.find(s => s.key === activeSection)?.label}
            </h2>
            {SIDEBAR_ITEMS.find(s => s.key === activeSection)?.badge && (
              <span style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '12px',
                background: 'rgba(249,115,22,0.12)', color: COLORS.orange,
                border: '1px solid rgba(249,115,22,0.25)', fontWeight: 600,
              }}>
                Preview
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                background: 'rgba(51,65,85,0.3)', border: `1px solid ${COLORS.borderCard}`,
                color: COLORS.textSecondary, cursor: 'pointer', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
              }}
            >
              <span>🏠</span> Accueil
            </button>
            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Contenu de la section active */}
        <div style={{ flex: 1, padding: '28px 32px', animation: 'fadeIn 0.3s ease-out' }}>
          {renderSection()}
        </div>

        {/* Footer */}
        <footer style={{
          padding: '16px 32px', borderTop: `1px solid ${COLORS.borderCard}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>
            © 2024 ACTUWISE — Plateforme Actuarielle Intelligente
          </span>
          <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>
            Assurance Automobile Tunisienne 🇹🇳
          </span>
        </footer>
      </main>
    </div>
  )
}

export default Dashboard
