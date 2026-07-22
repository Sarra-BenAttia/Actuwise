/**
 * ACTUWISE — src/components/forms/PredictionAssureForm.jsx
 * Formulaire de prédiction de prime pure pour un profil assuré — Module 3.
 *
 * 7 champs de saisie :
 *   - age_conducteur     (number)  — Âge du conducteur
 *   - classe_bm          (select)  — Classe Bonus-Malus (1 à 22)
 *   - puissance_fiscale  (number)  — Puissance fiscale du véhicule
 *   - region             (select)  — Région tunisienne
 *   - usage              (select)  — Usage du véhicule
 *   - energie            (select)  — Type d'énergie
 *   - anciennete_vehicule(number)  — Ancienneté du véhicule (années)
 *
 * Résultat affiché :
 *   - Fréquence, Sévérité, Prime Pure (cards)
 *   - Score Risque (jauge visuelle)
 *   - Classe Risque (badge coloré)
 *   - SHAP top 3 (facteurs influents)
 *
 * Utilise usePost(predictAssure) depuis hooks/useAPI.
 */

import React, { useState } from 'react'
import { usePost } from '../../hooks/useAPI'
import { predictAssure, formatNumber, formatTND } from '../../services/api'

// ============================================================
// Options pour les selects
// ============================================================
const REGIONS = ['Tunis', 'Sfax', 'Sousse', 'Nabeul', 'Bizerte', 'Gabès', 'Kairouan', 'Monastir', 'Autre']
const USAGES = ['Privé', 'Commercial', 'Administratif']
const ENERGIES = ['Essence', 'Diesel', 'GPL', 'Électrique']
const CLASSES_BM = Array.from({ length: 22 }, (_, i) => i + 1)

// ============================================================
// Valeurs initiales du formulaire
// ============================================================
const INITIAL_FORM = {
  age_conducteur: 35,
  classe_bm: 11,
  puissance_fiscale: 7,
  region: 'Tunis',
  usage: 'Privé',
  energie: 'Essence',
  anciennete_vehicule: 5,
}

/**
 * Jauge visuelle du score de risque (0-100)
 */
function ScoreGauge({ score = 0 }) {
  // Normaliser le score entre 0 et 100
  const normalizedScore = Math.max(0, Math.min(100, Number(score)))

  // Couleur selon le score
  const getColor = (s) => {
    if (s <= 30) return '#22c55e'   // Vert — faible risque
    if (s <= 60) return '#f97316'   // Orange — moyen
    return '#ef4444'                 // Rouge — élevé
  }

  const color = getColor(normalizedScore)
  const angle = (normalizedScore / 100) * 180 // 0° à 180° pour un demi-cercle

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* Jauge SVG en demi-cercle */}
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Arc de fond */}
        <path
          d="M 15 75 A 55 55 0 0 1 125 75"
          fill="none"
          stroke="rgba(51,65,85,0.3)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Arc de valeur */}
        <path
          d="M 15 75 A 55 55 0 0 1 125 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(normalizedScore / 100) * 173} 173`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        {/* Valeur au centre */}
        <text
          x="70"
          y="65"
          textAnchor="middle"
          fill={color}
          fontSize="24"
          fontWeight="700"
        >
          {normalizedScore.toFixed(0)}
        </text>
        <text
          x="70"
          y="78"
          textAnchor="middle"
          fill="#64748b"
          fontSize="10"
        >
          / 100
        </text>
      </svg>
    </div>
  )
}

/**
 * Badge coloré de la classe de risque
 */
function ClasseRisqueBadge({ classe }) {
  if (!classe) return null

  const badgeStyles = {
    'Faible': { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)', emoji: '🟢' },
    'Moyen': { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', border: 'rgba(249,115,22,0.3)', emoji: '🟡' },
    'Élevé': { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)', emoji: '🔴' },
    'Très élevé': { bg: 'rgba(239,68,68,0.25)', color: '#ef4444', border: 'rgba(239,68,68,0.5)', emoji: '🔴' },
  }

  // Trouver le style le plus proche
  const style = badgeStyles[classe] || badgeStyles['Moyen']

  return (
    <span style={{
      fontSize: '13px',
      padding: '6px 16px',
      borderRadius: '20px',
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      fontWeight: 700,
    }}>
      {style.emoji} {classe}
    </span>
  )
}

/**
 * Composant principal : formulaire de prédiction
 */
function PredictionAssureForm() {
  const [form, setForm] = useState(INITIAL_FORM)
  const { execute, data, loading, error, reset } = usePost(predictAssure)

  /**
   * Met à jour un champ du formulaire
   */
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  /**
   * Soumet le formulaire
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    // Convertir les valeurs numériques
    const payload = {
      ...form,
      age_conducteur: Number(form.age_conducteur),
      classe_bm: Number(form.classe_bm),
      puissance_fiscale: Number(form.puissance_fiscale),
      anciennete_vehicule: Number(form.anciennete_vehicule),
    }
    await execute(payload)
  }

  /**
   * Réinitialise le formulaire et les résultats
   */
  const handleReset = () => {
    setForm(INITIAL_FORM)
    reset()
  }

  // Extraire les résultats de la prédiction
  const result = data?.data || data

  return (
    <div style={styles.container}>
      {/* ========================================= */}
      {/* Formulaire de saisie                      */}
      {/* ========================================= */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <h4 style={styles.formTitle}>🧑 Profil de l'assuré</h4>

        <div style={styles.fieldsGrid}>
          {/* Âge du conducteur */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Âge du conducteur</label>
            <input
              type="number"
              min={18}
              max={99}
              value={form.age_conducteur}
              onChange={(e) => handleChange('age_conducteur', e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {/* Classe Bonus-Malus */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Classe Bonus-Malus</label>
            <select
              value={form.classe_bm}
              onChange={(e) => handleChange('classe_bm', e.target.value)}
              style={styles.select}
            >
              {CLASSES_BM.map(c => (
                <option key={c} value={c}>Classe {c}</option>
              ))}
            </select>
          </div>

          {/* Puissance fiscale */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Puissance fiscale (CV)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.puissance_fiscale}
              onChange={(e) => handleChange('puissance_fiscale', e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {/* Région */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Région</label>
            <select
              value={form.region}
              onChange={(e) => handleChange('region', e.target.value)}
              style={styles.select}
            >
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Usage */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Usage du véhicule</label>
            <select
              value={form.usage}
              onChange={(e) => handleChange('usage', e.target.value)}
              style={styles.select}
            >
              {USAGES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Énergie */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Type d'énergie</label>
            <select
              value={form.energie}
              onChange={(e) => handleChange('energie', e.target.value)}
              style={styles.select}
            >
              {ENERGIES.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Ancienneté véhicule */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Ancienneté véhicule (ans)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={form.anciennete_vehicule}
              onChange={(e) => handleChange('anciennete_vehicule', e.target.value)}
              style={styles.input}
              required
            />
          </div>
        </div>

        {/* Boutons */}
        <div style={styles.buttonRow}>
          <button type="submit" disabled={loading} style={{
            ...styles.btnPrimary,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'wait' : 'pointer',
          }}>
            {loading ? (
              <span>⏳ Calcul en cours...</span>
            ) : (
              <span>🔮 Prédire la prime pure</span>
            )}
          </button>

          <button type="button" onClick={handleReset} style={styles.btnSecondary}>
            🔄 Réinitialiser
          </button>
        </div>
      </form>

      {/* ========================================= */}
      {/* Message d'erreur                          */}
      {/* ========================================= */}
      {error && (
        <div style={styles.errorBox}>
          ❌ {error}
        </div>
      )}

      {/* ========================================= */}
      {/* Résultats de la prédiction                */}
      {/* ========================================= */}
      {result && (
        <div style={styles.resultsContainer}>
          <h4 style={styles.resultsTitle}>📊 Résultats de la prédiction</h4>

          {/* Cards métriques principales */}
          <div style={styles.metricsGrid}>
            {/* Fréquence */}
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>📈 Fréquence</span>
              <span style={styles.metricValue}>
                {result.frequence !== undefined
                  ? Number(result.frequence).toFixed(4)
                  : '—'}
              </span>
              <span style={styles.metricSub}>sinistres / an</span>
            </div>

            {/* Sévérité */}
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>💰 Sévérité</span>
              <span style={{ ...styles.metricValue, color: '#f97316' }}>
                {result.severite !== undefined
                  ? formatTND(result.severite)
                  : '—'}
              </span>
              <span style={styles.metricSub}>coût moyen / sinistre</span>
            </div>

            {/* Prime Pure */}
            <div style={{ ...styles.metricCard, border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.08)' }}>
              <span style={styles.metricLabel}>🎯 Prime Pure</span>
              <span style={{ ...styles.metricValue, color: '#3b82f6', fontSize: '28px' }}>
                {result.prime_pure !== undefined
                  ? formatTND(result.prime_pure)
                  : '—'}
              </span>
              <span style={styles.metricSub}>fréquence × sévérité</span>
            </div>
          </div>

          {/* Score et Classe de risque */}
          <div style={styles.riskRow}>
            {/* Jauge de score */}
            <div style={styles.riskCard}>
              <span style={styles.metricLabel}>⚡ Score de risque</span>
              <ScoreGauge score={result.score_risque ?? result.score ?? 50} />
            </div>

            {/* Classe de risque */}
            <div style={styles.riskCard}>
              <span style={styles.metricLabel}>🏷️ Classe de risque</span>
              <div style={{ marginTop: '16px' }}>
                <ClasseRisqueBadge classe={result.classe_risque ?? result.classe ?? 'Moyen'} />
              </div>
            </div>
          </div>

          {/* SHAP Top 3 — facteurs les plus influents */}
          {result.shap_top && result.shap_top.length > 0 && (
            <div style={styles.shapSection}>
              <h5 style={styles.shapTitle}>🔍 Facteurs les plus influents (SHAP)</h5>
              <div style={styles.shapList}>
                {result.shap_top.slice(0, 3).map((item, i) => {
                  const isPositive = Number(item.valeur ?? item.impact ?? item.shap_value ?? 0) > 0
                  return (
                    <div key={i} style={styles.shapItem}>
                      {/* Rang */}
                      <span style={{
                        ...styles.shapRank,
                        background: i === 0 ? 'rgba(59,130,246,0.2)' : 'rgba(51,65,85,0.3)',
                        color: i === 0 ? '#60a5fa' : '#94a3b8',
                      }}>
                        #{i + 1}
                      </span>

                      {/* Nom du facteur */}
                      <span style={styles.shapName}>
                        {item.feature || item.variable || item.nom || `Facteur ${i + 1}`}
                      </span>

                      {/* Impact */}
                      <span style={{
                        ...styles.shapImpact,
                        color: isPositive ? '#f87171' : '#4ade80',
                      }}>
                        {isPositive ? '▲' : '▼'}{' '}
                        {Math.abs(Number(item.valeur ?? item.impact ?? item.shap_value ?? 0)).toFixed(4)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Styles inline
// ============================================================
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  form: {
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid rgba(51,65,85,0.4)',
    borderRadius: '12px',
    padding: '24px',
  },
  formTitle: {
    margin: '0 0 20px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#cbd5e1',
  },
  fieldsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.5)',
    background: 'rgba(30,41,59,0.8)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.5)',
    background: 'rgba(30,41,59,0.8)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '12px 28px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
  },
  btnSecondary: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.5)',
    background: 'rgba(30,41,59,0.6)',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  errorBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    fontSize: '13px',
  },
  resultsContainer: {
    background: 'rgba(15,23,42,0.4)',
    border: '1px solid rgba(51,65,85,0.4)',
    borderRadius: '12px',
    padding: '24px',
  },
  resultsTitle: {
    margin: '0 0 20px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#cbd5e1',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  metricCard: {
    background: 'rgba(30,41,59,0.6)',
    border: '1px solid rgba(51,65,85,0.4)',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#22c55e',
    fontVariantNumeric: 'tabular-nums',
  },
  metricSub: {
    fontSize: '11px',
    color: '#475569',
  },
  riskRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  riskCard: {
    background: 'rgba(30,41,59,0.6)',
    border: '1px solid rgba(51,65,85,0.4)',
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
  },
  shapSection: {
    borderTop: '1px solid rgba(51,65,85,0.3)',
    paddingTop: '16px',
  },
  shapTitle: {
    margin: '0 0 12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#cbd5e1',
  },
  shapList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  shapItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(30,41,59,0.5)',
    border: '1px solid rgba(51,65,85,0.3)',
  },
  shapRank: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    flexShrink: 0,
  },
  shapName: {
    flex: 1,
    fontSize: '13px',
    color: '#e2e8f0',
    fontWeight: 500,
  },
  shapImpact: {
    fontSize: '13px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
}

export default PredictionAssureForm
