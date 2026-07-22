/**
 * ACTUWISE — src/App.jsx
 * Routeur principal de l'application.
 *
 * Routes :
 *   /           → Home.jsx (template Arsha — page d'accueil vitrine)
 *   /dashboard  → Dashboard.jsx (template DeskApp — dashboard actuariel)
 *
 * Toutes les routes non trouvées redirigent vers l'accueil.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'

function App() {
  return (
    <BrowserRouter>
      {/* Notifications toast globales (erreurs API, succès) */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '14px',
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Page d'accueil — template Arsha */}
        <Route path="/" element={<Home />} />

        {/* Dashboard actuariel — template DeskApp */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
