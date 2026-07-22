/**
 * ACTUWISE — src/components/forms/PredictionReservingForm.jsx
 * Formulaire de prédiction des réserves IBNR — Module 2.
 *
 * Deux modes de saisie :
 *   - Textarea pour coller un triangle JSON
 *   - Upload CSV via FileReader
 *
 * Résultats affichés :
 *   - Triangle complété (grille colorée — cellules prédites en bleu)
 *   - IBNR par année de survenance (mini-tableau)
 *   - IBNR total (gros chiffre)
 *
 * Utilise usePost(predictReserving) depuis hooks/useAPI.
 */

import React, { useState, useRef } from 'react'
import { usePost } from '../../hooks/useAPI'
import { predictReserving, formatNumber, formatTND } from '../../services/api'

// ============================================================
// Exemple de triangle JSON pour le placeholder
// ============================================================
const TRIANGLE_EXEMPLE = `[
  [1000, 1200, 1350, 1400, 1420],
  [1100, 1300, 1450, 1500, null],
  [1050, 1250, 1380, null, null],
  [1150, 1320, null, null, null],
  [1200, null, null, null, null]
]`

/**
 * Parse le contenu CSV en tableau 2D de nombres
 */
function parseCSV(text) {
  const lines = text.trim().split('\n')
  return lines.map(line =>
    line.split(/[,;\t]/).map(cell => {
      const trimmed = cell.trim()
      if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed === 'na') return null
      const num = Number(trimmed)
      return isNaN(num) ? null : num
    })
  )
}

/**
 * Grille colorée du triangle complété
 * Les cellules prédites (initialement null) sont surlignées en bleu
 */
function TriangleGrid({ triangleOriginal = [], triangleComplet = [] }) {
  if (!triangleComplet || triangleComplet.length === 0) return null

  return (
    <div style={styles.triangleWrapper}>
      <div style={styles.triangleScroll}>
        <table style={styles.triangleTable}>
          <thead>
            <tr>
              <th style={styles.triangleTh}>Année</th>
              {triangleComplet[0]?.map((_, j) => (
                <th key={j} style={styles.triangleTh}>Dev. {j + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {triangleComplet.map((row, i) => (
              <tr key={i}>
                {/* Année de survenance */}
                <td style={{
                  ...styles.triangleTd,
                  fontWeight: 700,
                  color: '#94a3b8',
                  background: 'rgba(15,23,42,0.6)',
                }}>
                  {i + 1}
                </td>

                {/* Cellules du triangle */}
                {row.map((val, j) => {
                  // Vérifier si la cellule était originellement vide (prédite)
                  const wasNull = triangleOriginal[i]
                    ? (triangleOriginal[i][j] === null || triangleOriginal[i][j] === undefined)
                    : false

                  return (
                    <td
                      key={j}
                      style={{
                        ...styles.triangleTd,
                        background: wasNull
                          ? 'rgba(59,130,246,0.12)'  // Cellule prédite — fond bleu
                          : 'transparent',
                        color: wasNull ? '#60a5fa' : '#e2e8f0',
                        fontWeight: wasNull ? 600 : 400,
                        borderLeft: wasNull && j > 0 && !((triangleOriginal[i] || [])[j - 1] === null)
                          ? '2px solid rgba(59,130,246,0.4)'
                          : '1px solid rgba(51,65,85,0.2)',
                      }}
                    >
                      {val !== null && val !== undefined
                        ? formatNumber(val, 0)
                        : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div style={styles.triangleLegend}>
        <span style={styles.legendItem}>
          <span style={{
            display: 'inline-block', width: '12px', height: '12px',
            background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: '2px', marginRight: '6px',
          }} />
          Valeurs prédites (IBNR)
        </span>
        <span style={styles.legendItem}>
          <span style={{
            display: 'inline-block', width: '12px', height: '12px',
            background: 'transparent', border: '1px solid rgba(51,65,85,0.4)',
            borderRadius: '2px', marginRight: '6px',
          }} />
          Valeurs observées
        </span>
      </div>
    </div>
  )
}

/**
 * Composant principal : formulaire de prédiction des réserves
 */
function PredictionReservingForm() {
  const [triangleText, setTriangleText] = useState('')
  const [triangleOriginal, setTriangleOriginal] = useState(null)
  const [inputMode, setInputMode] = useState('json') // 'json' ou 'csv'
  const fileInputRef = useRef(null)
  const { execute, data, loading, error, reset } = usePost(predictReserving)

  /**
   * Gère l'upload d'un fichier CSV
   */
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      setTriangleText(text)
      setInputMode('csv')
    }
    reader.readAsText(file)
  }

  /**
   * Soumet le triangle au backend
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    let triangleData
    try {
      if (inputMode === 'json') {
        triangleData = JSON.parse(triangleText)
      } else {
        triangleData = parseCSV(triangleText)
      }
    } catch (err) {
      alert('⚠️ Format invalide. Vérifiez le format JSON ou CSV du triangle.')
      return
    }

    // Valider la structure : doit être un tableau 2D
    if (!Array.isArray(triangleData) || !Array.isArray(triangleData[0])) {
      alert('⚠️ Le triangle doit être un tableau 2D (matrice).')
      return
    }

    // Sauvegarder le triangle original pour la coloration
    setTriangleOriginal(triangleData)

    await execute({ triangle_data: triangleData })
  }

  /**
   * Réinitialise tout
   */
  const handleReset = () => {
    setTriangleText('')
    setTriangleOriginal(null)
    setInputMode('json')
    reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Extraire les résultats
  const result = data?.data || data

  return (
    <div style={styles.container}>
      {/* ========================================= */}
      {/* Formulaire de saisie du triangle          */}
      {/* ========================================= */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <h4 style={styles.formTitle}>📐 Triangle de développement</h4>

        {/* Sélecteur de mode de saisie */}
        <div style={styles.modeSwitch}>
          <button
            type="button"
            onClick={() => setInputMode('json')}
            style={{
              ...styles.modeBtnBase,
              ...(inputMode === 'json' ? styles.modeBtnActive : styles.modeBtnInactive),
            }}
          >
            📝 JSON
          </button>
          <button
            type="button"
            onClick={() => setInputMode('csv')}
            style={{
              ...styles.modeBtnBase,
              ...(inputMode === 'csv' ? styles.modeBtnActive : styles.modeBtnInactive),
            }}
          >
            📄 CSV / Upload
          </button>
        </div>

        {/* Mode JSON : textarea */}
        {inputMode === 'json' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Collez le triangle au format JSON (null = valeurs à prédire)
            </label>
            <textarea
              value={triangleText}
              onChange={(e) => setTriangleText(e.target.value)}
              placeholder={TRIANGLE_EXEMPLE}
              style={styles.textarea}
              rows={8}
              spellCheck={false}
            />
          </div>
        )}

        {/* Mode CSV : upload fichier */}
        {inputMode === 'csv' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Importez un fichier CSV (séparateur : virgule, point-virgule ou tabulation)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={handleFileUpload}
              style={styles.fileInput}
            />
            {triangleText && (
              <div style={{ marginTop: '8px' }}>
                <label style={styles.label}>Aperçu du contenu :</label>
                <textarea
                  value={triangleText}
                  onChange={(e) => setTriangleText(e.target.value)}
                  style={{ ...styles.textarea, height: '120px' }}
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        )}

        {/* Boutons */}
        <div style={styles.buttonRow}>
          <button type="submit" disabled={loading || !triangleText.trim()} style={{
            ...styles.btnPrimary,
            opacity: (loading || !triangleText.trim()) ? 0.5 : 1,
            cursor: loading ? 'wait' : !triangleText.trim() ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ Estimation en cours...' : '🧮 Estimer les réserves'}
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
      {/* Résultats de l'estimation                 */}
      {/* ========================================= */}
      {result && (
        <div style={styles.resultsContainer}>
          <h4 style={styles.resultsTitle}>📊 Résultats de l'estimation IBNR</h4>

          {/* IBNR Total — chiffre phare */}
          {result.ibnr_total !== undefined && (
            <div style={styles.ibnrTotalCard}>
              <span style={styles.ibnrTotalLabel}>Réserve IBNR Totale</span>
              <span style={styles.ibnrTotalValue}>
                {formatTND(result.ibnr_total)}
              </span>
              {result.methode && (
                <span style={styles.methodeBadge}>
                  Méthode : {result.methode}
                </span>
              )}
            </div>
          )}

          {/* Triangle complété (grille colorée) */}
          {result.triangle_complet && (
            <div style={{ marginBottom: '20px' }}>
              <h5 style={styles.subTitle}>🔢 Triangle complété</h5>
              <TriangleGrid
                triangleOriginal={triangleOriginal}
                triangleComplet={result.triangle_complet}
              />
            </div>
          )}

          {/* IBNR par année (mini-tableau) */}
          {result.ibnr_par_annee && result.ibnr_par_annee.length > 0 && (
            <div>
              <h5 style={styles.subTitle}>📋 IBNR par année de survenance</h5>
              <div style={styles.miniTableWrapper}>
                <table style={styles.miniTable}>
                  <thead>
                    <tr>
                      <th style={styles.miniTh}>Année</th>
                      <th style={styles.miniTh}>IBNR (TND)</th>
                      <th style={styles.miniTh}>Part (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ibnr_par_annee.map((row, i) => (
                      <tr key={i} style={{
                        background: i % 2 === 0 ? 'rgba(30,41,59,0.6)' : 'rgba(15,23,42,0.6)',
                      }}>
                        <td style={{ ...styles.miniTd, fontWeight: 600, color: '#94a3b8' }}>
                          {row.annee || i + 1}
                        </td>
                        <td style={{ ...styles.miniTd, color: '#60a5fa', fontWeight: 600 }}>
                          {formatTND(row.ibnr ?? row.montant)}
                        </td>
                        <td style={styles.miniTd}>
                          {row.part !== undefined
                            ? `${Number(row.part).toFixed(1)}%`
                            : result.ibnr_total
                              ? `${((Number(row.ibnr ?? row.montant) / result.ibnr_total) * 100).toFixed(1)}%`
                              : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    margin: '0 0 16px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#cbd5e1',
  },
  modeSwitch: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  modeBtnBase: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modeBtnActive: {
    background: 'rgba(59,130,246,0.2)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.4)',
  },
  modeBtnInactive: {
    background: 'rgba(30,41,59,0.6)',
    color: '#64748b',
    border: '1px solid rgba(51,65,85,0.3)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 600,
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.5)',
    background: 'rgba(30,41,59,0.8)',
    color: '#e2e8f0',
    fontSize: '13px',
    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  fileInput: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.5)',
    background: 'rgba(30,41,59,0.8)',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
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
  subTitle: {
    margin: '0 0 12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#94a3b8',
  },
  ibnrTotalCard: {
    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  ibnrTotalLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  ibnrTotalValue: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#3b82f6',
    fontVariantNumeric: 'tabular-nums',
  },
  methodeBadge: {
    fontSize: '11px',
    padding: '3px 12px',
    borderRadius: '20px',
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.3)',
    fontWeight: 600,
  },
  // --- Triangle ---
  triangleWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.4)',
  },
  triangleScroll: {
    overflowX: 'auto',
  },
  triangleTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    minWidth: '300px',
  },
  triangleTh: {
    padding: '10px 12px',
    textAlign: 'right',
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: '11px',
    textTransform: 'uppercase',
    background: 'rgba(15,23,42,0.8)',
    borderBottom: '1px solid rgba(51,65,85,0.5)',
    whiteSpace: 'nowrap',
  },
  triangleTd: {
    padding: '8px 12px',
    textAlign: 'right',
    color: '#e2e8f0',
    fontSize: '12px',
    borderBottom: '1px solid rgba(51,65,85,0.2)',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  triangleLegend: {
    padding: '8px 12px',
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    borderTop: '1px solid rgba(51,65,85,0.3)',
    background: 'rgba(15,23,42,0.4)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: '#64748b',
  },
  // --- Mini-tableau IBNR ---
  miniTableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid rgba(51,65,85,0.4)',
  },
  miniTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  miniTh: {
    padding: '10px 16px',
    textAlign: 'right',
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase',
    background: 'rgba(15,23,42,0.8)',
    borderBottom: '1px solid rgba(51,65,85,0.5)',
  },
  miniTd: {
    padding: '10px 16px',
    textAlign: 'right',
    color: '#e2e8f0',
    fontSize: '13px',
    borderBottom: '1px solid rgba(51,65,85,0.2)',
    fontVariantNumeric: 'tabular-nums',
  },
}

export default PredictionReservingForm
