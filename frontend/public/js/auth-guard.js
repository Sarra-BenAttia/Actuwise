/**
 * auth-guard.js — Protection des routes JWT
 * À inclure sur chaque page protégée (sauf login.html).
 * Redirige vers /login si le token est absent.
 */
(function() {
  const token = localStorage.getItem('actuwise_token');
  if (!token) {
    window.location.href = '/login';
    throw new Error('Redirect to login');
  }

  // Expose une fonction pour les appels API authentifiés
  window.apiHeaders = function() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token')
    };
  };

  window.apiFetch = async function(path, options = {}) {
    const BASE = '/api';
    const res = await fetch(BASE + path, {
      ...options,
      headers: { ...window.apiHeaders(), ...(options.headers || {}) }
    });
    if (res.status === 401) {
      localStorage.removeItem('actuwise_token');
      window.location.href = '/login';
      return null;
    }
    return res;
  };

  window.doLogout = function() {
    localStorage.removeItem('actuwise_token');
    window.location.href = '/login';
  };

  // Extraire le nom utilisateur du token
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    window.ACTUWISE_USER = payload.sub || 'Actuaire';
  } catch(e) {
    window.ACTUWISE_USER = 'Actuaire';
  }
})();
