/**
 * ACTUWISE — src/components/kpis/KPICard.jsx
 * Carte KPI réutilisable pour le dashboard.
 *
 * Adapté au style DeskApp (classes CSS du template conservées).
 * Affiche : label, valeur, unité, modèle retenu, icône, couleur.
 */

import React from 'react'

/**
 * Détermine la couleur CSS selon la valeur et le type de KPI.
 * @param {string} couleur - "green" | "orange" | "red" | "blue" | "purple" | "gray"
 */
function getCouleurClasses(couleur) {
  const map = {
    green:  { badge: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)'  },
    orange: { badge: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
    red:    { badge: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
    blue:   { badge: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
    purple: { badge: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' },
    gray:   { badge: '#94a3b8', bg: 'rgba(148,163,184,0.12)',border: 'rgba(148,163,184,0.3)'},
  }
  return map[couleur] || map.blue
}

/**
 * Formate la valeur selon l'unité.
 */
function formatValeur(valeur, unite) {
  if (valeur === null || valeur === undefined) return '—'
  if (unite === 'TND') {
    return new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(valeur)
  }
  if (unite === '%') return `${Number(valeur).toFixed(1)}`
  if (unite === '') return Number(valeur).toFixed(4)
  return String(valeur)
}

/**
 * @param {string}   label          - Titre du KPI
 * @param {number}   valeur         - Valeur numérique
 * @param {string}   unite          - "TND" | "%" | "" (Gini)
 * @param {string}   couleur        - "green" | "orange" | "red" | "blue" | "purple" | "gray"
 * @param {string}   modele         - Nom du modèle retenu (affiché en badge discret)
 * @param {string}   interpretation - Texte interprétatif (ex: "✅ Rentable")
 * @param {string}   icone          - Emoji ou texte court pour l'icône
 * @param {string}   status         - "not_implemented" pour afficher un placeholder
 * @param {string}   message        - Message si placeholder
 * @param {boolean}  loading        - État de chargement
 */
function KPICard({
  label,
  valeur,
  unite = '',
  couleur = 'blue',
  modele = null,
  interpretation = null,
  icone = '📊',
  status = null,
  message = null,
  loading = false,
}) {
  const colors = getCouleurClasses(couleur)
  const isPlaceholder = status === 'not_implemented'
  const valeurFormatee = formatValeur(valeur, unite)

  return (
    <div
      className="card info-card"
      style={{
        borderLeft: `4px solid ${colors.badge}`,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* En-tête : label + icône */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ fontSize: '22px' }}>{icone}</span>
      </div>

      {/* Valeur principale */}
      {loading ? (
        <div style={{
          height: '36px',
          background: 'rgba(148,163,184,0.2)',
          borderRadius: '6px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : isPlaceholder ? (
        <div>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#94a3b8' }}>—</span>
          <span
            style={{
              display: 'inline-block',
              marginLeft: '8px',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'rgba(148,163,184,0.2)',
              color: '#94a3b8',
              fontWeight: 600,
            }}
          >
            🔜 Prochainement
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '32px', fontWeight: 700, color: colors.badge, lineHeight: 1 }}>
            {valeurFormatee}
          </span>
          {unite && (
            <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 500 }}>
              {unite}
            </span>
          )}
        </div>
      )}

      {/* Pied : interprétation + badge modèle */}
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        {interpretation && !isPlaceholder && !loading && (
          <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>
            {interpretation}
          </span>
        )}
        {isPlaceholder && message && (
          <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
            {message}
          </span>
        )}
        {modele && !isPlaceholder && !loading && (
          <span
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '20px',
              background: `${colors.badge}22`,
              color: colors.badge,
              border: `1px solid ${colors.border}`,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Modèle : {modele}
          </span>
        )}
      </div>

      {/* Barre de couleur décorative */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '4px',
        height: '100%',
        background: `linear-gradient(to bottom, ${colors.badge}, transparent)`,
        opacity: 0.4,
      }} />
    </div>
  )
}

export default KPICard
