/**
 * ACTUWISE — src/main.jsx
 * Point d'entrée de l'application React.
 * Monte le composant racine App dans le div#root de index.html.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './globals.css'
import './dashboard.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
