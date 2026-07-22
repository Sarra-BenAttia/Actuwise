'use client'

import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  source?: string
}

const initialMessages: Message[] = [
  {
    role: 'assistant',
    content: 'Bonjour ! Je suis l\'assistant IA d\'ACTUWISE, spécialisé en actuariat automobile et réglementation assurantielle tunisienne. Je peux répondre à vos questions sur les circulaires CGA, IFRS 17, le provisionnement IBNR et la modélisation des risques.',
    source: 'Base de connaissances ACTUWISE v2.1',
  },
  {
    role: 'user',
    content: 'Quelle est la méthode recommandée par la CGA pour le provisionnement des sinistres tardifs ?',
  },
  {
    role: 'assistant',
    content: 'La Circulaire CGA n°2019-08 recommande l\'utilisation conjointe de la méthode Chain-Ladder pour les branches à développement rapide (matériels) et de Bornhuetter-Ferguson pour les branches corporelles où l\'expérience passée est instable. La provision minimale IBNR doit représenter au moins 15% des sinistres déclarés non réglés pour la branche automobile.',
    source: 'CGA Circulaire 2019-08 — Art. 34 & 38',
  },
]

const suggestions = [
  'Quelles sont les exigences IFRS 17 pour les contrats automobile ?',
  'Comment calculer la marge pour risque (Risk Adjustment) ?',
  'Quels sont les facteurs de développement moyens pour l\'automobile en Tunisie ?',
  'Comment interpréter un ratio combiné supérieur à 100% ?',
  'Quelle est la réglementation sur le bonus-malus en Tunisie ?',
  'Expliquer la méthode Cape Cod vs Chain-Ladder',
]

export function AssistantModule() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setMessages(prev => [
      ...prev,
      { role: 'user', content: trimmed },
      {
        role: 'assistant',
        content: `Analyse en cours... En tant qu'assistant actuariel ACTUWISE, voici ma réponse concernant "${trimmed}" : Cette question touche à un domaine clé de l'actuariat automobile. Pour une réponse précise, je consulte la base RAG incluant les circulaires CGA, les normes IFRS 17, et les données historiques BIAT 2018-2023.`,
        source: 'RAG — Base documentaire actuarielle',
      },
    ])
    setInput('')
  }

  return (
    <div>
      <div className="chat-container">
        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <md-icon style={{ fontSize: 16, color: 'var(--md-sys-color-primary)' }}>smart_toy</md-icon>
                  <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-primary)', fontWeight: 600 }}>ACTUWISE IA</span>
                </div>
              )}
              <div className="md-typescale-body-medium">{msg.content}</div>
              {msg.source && (
                <div className="chat-source">
                  <md-icon style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 4 }}>source</md-icon>
                  {msg.source}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick suggestions */}
        <div className="chat-suggestions">
          <span className="md-typescale-label-small chat-suggestions-label">Suggestions de questions :</span>
          <div className="chat-suggestions-chips">
            {suggestions.map((s, i) => (
              <md-assist-chip
                key={i}
                label={s}
                onClick={() => setInput(s)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="chat-input-bar">
          <md-icon style={{ color: 'var(--md-sys-color-primary)', fontSize: 20 }}>smart_toy</md-icon>
          <input
            className="chat-input"
            type="text"
            placeholder="Posez une question sur les circulaires CGA, IFRS 17, la modélisation..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend()
            }}
          />
          <md-filled-icon-button onClick={handleSend} disabled={!input.trim()} aria-label="Envoyer">
            <md-icon>send</md-icon>
          </md-filled-icon-button>
        </div>
      </div>

      {/* Info about the RAG system */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <div className="md-typescale-title-small chart-card-title" style={{ marginBottom: 12 }}>
          <md-icon>info</md-icon>
          Sources documentaires indexées (RAG)
        </div>
        <div className="three-col-grid">
          {[
            { icon: 'gavel', label: 'Circulaires CGA', count: '24 documents', sub: 'Réglementation tunisienne' },
            { icon: 'menu_book', label: 'Normes IFRS 17', count: '8 documents', sub: 'Standards comptables' },
            { icon: 'analytics', label: 'Données BIAT', count: '6 exercices', sub: '2018–2023 automobile' },
          ].map((src) => (
            <div key={src.label} style={{
              background: 'var(--md-sys-color-surface-container)',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              border: '1px solid var(--md-sys-color-outline-variant)'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <md-icon>{src.icon}</md-icon>
              </div>
              <div>
                <div className="md-typescale-label-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>{src.label}</div>
                <div className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-primary)', fontWeight: 600 }}>{src.count}</div>
                <div className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{src.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
