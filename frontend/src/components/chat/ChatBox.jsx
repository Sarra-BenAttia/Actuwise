/**
 * ACTUWISE — src/components/chat/ChatBox.jsx
 * Interface chat pour l'assistant IA — Module 6 PLACEHOLDER.
 *
 * Layout :
 *   - Zone de messages scrollable (en haut)
 *   - Questions suggérées en chips (quand la conversation est vide)
 *   - Zone d'input + bouton 'Envoyer' (en bas)
 *
 * Style :
 *   - Messages utilisateur : alignés à droite, fond bleu
 *   - Messages IA : alignés à gauche, fond gris
 *   - Sources affichées si disponibles
 *
 * Pour le moment, affiche un message placeholder 'Module en cours de développement'.
 *
 * Props :
 *   onSend  (function async)  — Callback appelé avec le texte du message
 *   loading (bool)            — État de chargement (IA en train de répondre)
 */

import React, { useState, useRef, useEffect } from 'react'

// ============================================================
// Questions suggérées (chips cliquables)
// ============================================================
const QUESTIONS_SUGGEREES = [
  'Quel est le ratio combiné actuel du portefeuille ?',
  'Quels segments sont déficitaires ?',
  'Explique la méthode Chain-Ladder.',
  'Quelles sont les réserves IBNR estimées ?',
  'Compare les performances GLM vs XGBoost.',
]

/**
 * Composant d'un message dans le chat
 */
function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
    }}>
      {/* Avatar IA (à gauche) */}
      {!isUser && (
        <div style={styles.avatarIA}>🤖</div>
      )}

      <div style={{
        maxWidth: '75%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {/* Bulle de message */}
        <div style={{
          padding: '12px 16px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
            : 'rgba(30,41,59,0.8)',
          color: '#e2e8f0',
          fontSize: '14px',
          lineHeight: 1.6,
          border: isUser
            ? 'none'
            : '1px solid rgba(51,65,85,0.4)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.content}
        </div>

        {/* Sources (si disponibles, pour les réponses IA) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div style={styles.sourcesContainer}>
            <span style={styles.sourcesLabel}>📚 Sources :</span>
            {message.sources.map((source, i) => (
              <span key={i} style={styles.sourceChip}>
                {source}
              </span>
            ))}
          </div>
        )}

        {/* Horodatage */}
        <span style={{
          fontSize: '10px',
          color: '#475569',
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          marginTop: '2px',
        }}>
          {message.timestamp || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Avatar utilisateur (à droite) */}
      {isUser && (
        <div style={styles.avatarUser}>👤</div>
      )}
    </div>
  )
}

/**
 * Indicateur de frappe (3 points animés)
 */
function TypingIndicator() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px',
    }}>
      <div style={styles.avatarIA}>🤖</div>
      <div style={{
        padding: '12px 20px',
        borderRadius: '16px 16px 16px 4px',
        background: 'rgba(30,41,59,0.8)',
        border: '1px solid rgba(51,65,85,0.4)',
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#64748b',
              animation: `typing 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Composant principal : interface de chat
 */
function ChatBox({ onSend = null, loading = false }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /**
   * Envoie un message
   */
  const handleSend = async (text = null) => {
    const messageText = (text || inputText).trim()
    if (!messageText) return

    // Ajouter le message utilisateur
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMessage])
    setInputText('')

    // --- PLACEHOLDER : module pas encore implémenté ---
    // Pour le moment, répondre avec un message de développement
    if (!onSend) {
      setTimeout(() => {
        const iaMessage = {
          role: 'assistant',
          content: '🚧 Ce module est en cours de développement. L\'assistant IA sera disponible prochainement avec des capacités de RAG sur la documentation actuarielle tunisienne.',
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages(prev => [...prev, iaMessage])
      }, 1200)
      return
    }

    // Appeler le callback onSend (quand le module sera actif)
    try {
      const response = await onSend(messageText)
      if (response) {
        const iaMessage = {
          role: 'assistant',
          content: response.reponse || response.content || response.message || String(response),
          sources: response.sources || [],
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages(prev => [...prev, iaMessage])
      }
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: `❌ Erreur lors de la communication avec l'assistant : ${err.message || 'Erreur inconnue'}`,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  /**
   * Gère la touche Entrée (envoyer) / Shift+Entrée (nouvelle ligne)
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /**
   * Clique sur une question suggérée
   */
  const handleSuggestionClick = (question) => {
    handleSend(question)
  }

  const isConversationEmpty = messages.length === 0

  return (
    <div style={styles.container}>
      {/* ========================================= */}
      {/* En-tête du chat                           */}
      {/* ========================================= */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          <div>
            <h4 style={styles.headerTitle}>Assistant Actuariel IA</h4>
            <span style={styles.headerSub}>Module 6 — RAG Documentaire</span>
          </div>
        </div>
        <span style={styles.statusBadge}>
          🔜 En développement
        </span>
      </div>

      {/* ========================================= */}
      {/* Zone de messages (scrollable)              */}
      {/* ========================================= */}
      <div style={styles.messagesZone}>
        {/* Message de bienvenue quand la conversation est vide */}
        {isConversationEmpty && (
          <div style={styles.welcomeBox}>
            <span style={{ fontSize: '36px' }}>💬</span>
            <h3 style={styles.welcomeTitle}>
              Bienvenue dans l'assistant ACTUWISE
            </h3>
            <p style={styles.welcomeText}>
              Posez vos questions sur l'analyse actuarielle, les méthodes de provisionnement,
              ou les résultats du portefeuille automobile tunisien.
            </p>
            <div style={styles.devNotice}>
              🚧 Module en cours de développement — les réponses sont simulées.
            </div>
          </div>
        )}

        {/* Messages de la conversation */}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {/* Indicateur de frappe */}
        {loading && <TypingIndicator />}

        {/* Ancre pour le scroll automatique */}
        <div ref={messagesEndRef} />
      </div>

      {/* ========================================= */}
      {/* Questions suggérées (chips)                */}
      {/* ========================================= */}
      {isConversationEmpty && (
        <div style={styles.suggestionsContainer}>
          <span style={styles.suggestionsLabel}>💡 Suggestions :</span>
          <div style={styles.chipsList}>
            {QUESTIONS_SUGGEREES.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(q)}
                style={styles.chip}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* Zone d'input                               */}
      {/* ========================================= */}
      <div style={styles.inputZone}>
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez votre question..."
          style={styles.inputField}
          rows={1}
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !inputText.trim()}
          style={{
            ...styles.sendBtn,
            opacity: (loading || !inputText.trim()) ? 0.4 : 1,
            cursor: (loading || !inputText.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳' : '📤'}
          <span style={{ marginLeft: '4px' }}>Envoyer</span>
        </button>
      </div>

      {/* Style global pour l'animation des points */}
      <style>{`
        @keyframes typing {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
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
    height: '600px',
    borderRadius: '12px',
    border: '1px solid rgba(51,65,85,0.4)',
    background: 'rgba(15,23,42,0.6)',
    overflow: 'hidden',
  },
  // --- En-tête ---
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(51,65,85,0.4)',
    background: 'rgba(15,23,42,0.8)',
    flexShrink: 0,
  },
  headerTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  headerSub: {
    fontSize: '11px',
    color: '#64748b',
  },
  statusBadge: {
    fontSize: '11px',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'rgba(148,163,184,0.15)',
    color: '#94a3b8',
    border: '1px solid rgba(148,163,184,0.25)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  // --- Zone messages ---
  messagesZone: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
  },
  // --- Bienvenue ---
  welcomeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 20px',
    gap: '10px',
  },
  welcomeTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#cbd5e1',
  },
  welcomeText: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
    maxWidth: '450px',
    lineHeight: 1.6,
  },
  devNotice: {
    fontSize: '12px',
    padding: '8px 16px',
    borderRadius: '8px',
    background: 'rgba(249,115,22,0.1)',
    border: '1px solid rgba(249,115,22,0.2)',
    color: '#fb923c',
    fontWeight: 500,
    marginTop: '8px',
  },
  // --- Avatars ---
  avatarIA: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(59,130,246,0.15)',
    border: '1px solid rgba(59,130,246,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
    marginRight: '8px',
  },
  avatarUser: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
    marginLeft: '8px',
  },
  // --- Sources ---
  sourcesContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    alignItems: 'center',
    marginTop: '4px',
  },
  sourcesLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
  },
  sourceChip: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '12px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)',
  },
  // --- Suggestions ---
  suggestionsContainer: {
    padding: '10px 20px',
    borderTop: '1px solid rgba(51,65,85,0.3)',
    background: 'rgba(15,23,42,0.4)',
    flexShrink: 0,
  },
  suggestionsLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
    display: 'block',
    marginBottom: '8px',
  },
  chipsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  chip: {
    fontSize: '12px',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid rgba(51,65,85,0.4)',
    background: 'rgba(30,41,59,0.6)',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  // --- Zone d'input ---
  inputZone: {
    display: 'flex',
    gap: '10px',
    padding: '14px 20px',
    borderTop: '1px solid rgba(51,65,85,0.4)',
    background: 'rgba(15,23,42,0.8)',
    alignItems: 'center',
    flexShrink: 0,
  },
  inputField: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(51,65,85,0.5)',
    background: 'rgba(30,41,59,0.8)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
    lineHeight: 1.4,
    fontFamily: 'inherit',
  },
  sendBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 6px rgba(59,130,246,0.3)',
    flexShrink: 0,
  },
}

export default ChatBox
