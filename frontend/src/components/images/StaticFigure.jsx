/**
 * ACTUWISE — src/components/images/StaticFigure.jsx
 * Composant pour afficher les figures PNG statiques des notebooks.
 *
 * Les figures sont servies par FastAPI depuis /figures/*.png
 * Gère : loading, erreur (figure manquante), zoom au clic.
 */

import React, { useState } from 'react'

const BACKEND_URL = 'http://localhost:8000'

/**
 * @param {string}  src         - URL complète ou chemin relatif de la figure
 * @param {string}  alt         - Texte alternatif (accessibilité + titre affiché)
 * @param {string}  caption     - Légende optionnelle sous la figure
 * @param {boolean} zoomable    - Active le zoom au clic (défaut: true)
 * @param {string}  height      - Hauteur CSS (défaut: "auto")
 * @param {string}  maxHeight   - Hauteur max CSS (défaut: "500px")
 */
function StaticFigure({ src, alt, caption, zoomable = true, height = 'auto', maxHeight = '500px' }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  // Construire l'URL complète si nécessaire
  const fullUrl = src?.startsWith('http') ? src : `${BACKEND_URL}${src}`

  if (!src) {
    return (
      <div style={styles.placeholder}>
        <span style={{ fontSize: '32px' }}>🖼️</span>
        <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>Figure non disponible</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ ...styles.container, height, maxHeight }}>
        {/* Skeleton pendant le chargement */}
        {!loaded && !error && (
          <div style={styles.skeleton}>
            <div style={styles.skeletonPulse} />
          </div>
        )}

        {/* Erreur de chargement */}
        {error && (
          <div style={styles.placeholder}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <p style={{ color: '#f97316', marginTop: '8px', fontSize: '14px' }}>
              Figure manquante
            </p>
            <code style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              {src}
            </code>
          </div>
        )}

        {/* Image */}
        <img
          src={fullUrl}
          alt={alt}
          style={{
            ...styles.image,
            display: loaded && !error ? 'block' : 'none',
            cursor: zoomable ? 'zoom-in' : 'default',
          }}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true) }}
          onClick={() => zoomable && setZoomed(true)}
        />
      </div>

      {/* Légende */}
      {caption && loaded && !error && (
        <p style={styles.caption}>{caption}</p>
      )}

      {/* Modal zoom */}
      {zoomed && (
        <div style={styles.modal} onClick={() => setZoomed(false)}>
          <div style={styles.modalContent}>
            <button style={styles.closeBtn} onClick={() => setZoomed(false)}>✕</button>
            <img
              src={fullUrl}
              alt={alt}
              style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: '8px' }}
            />
            {caption && <p style={{ ...styles.caption, color: '#e2e8f0', marginTop: '12px' }}>{caption}</p>}
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(51,65,85,0.5)',
  },
  image: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
    borderRadius: '8px',
    transition: 'transform 0.2s ease',
  },
  skeleton: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonPulse: {
    width: '100%',
    height: '300px',
    background: 'linear-gradient(90deg, rgba(51,65,85,0.3) 25%, rgba(71,85,105,0.4) 50%, rgba(51,65,85,0.3) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '8px',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    minHeight: '200px',
    color: '#475569',
  },
  caption: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'zoom-out',
  },
  modalContent: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: '-40px',
    right: 0,
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    fontSize: '18px',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}

export default StaticFigure
