/**
 * app-navbar.js — Composant navbar ACTUWISE partagé
 * S'injecte dans <div id="app-navbar"> sur chaque page applicative.
 * Utilise ACTUWISE_MODULES depuis nav-config.js
 */
(function() {
  const BASE_CSS = `
    <style>
      #app-navbar {
        width: 240px;
        min-height: 100vh;
        background: linear-gradient(180deg, #111827 0%, #1f2937 100%);
        display: flex;
        flex-direction: column;
        padding: 0;
        position: fixed;
        left: 0; top: 0;
        z-index: 100;
        box-shadow: 4px 0 20px rgba(0,0,0,0.25);
        font-family: 'Inter', sans-serif;
      }
      .anav-logo {
        padding: 20px 20px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex; align-items: center; gap: 10px;
        text-decoration: none;
      }
      .anav-logo-icon {
        width: 36px; height: 36px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 900; color: white;
        box-shadow: 0 4px 12px rgba(37,99,235,0.4);
        flex-shrink: 0;
      }
      .anav-logo-text { display: flex; flex-direction: column; }
      .anav-logo-name { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: 0.5px; }
      .anav-logo-sub  { font-size: 9px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 1px; }
      .anav-section-label {
        padding: 14px 18px 6px;
        font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.35);
        text-transform: uppercase; letter-spacing: 1.5px;
      }
      .anav-item {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 16px;
        margin: 1px 8px;
        border-radius: 8px;
        color: rgba(255,255,255,0.65);
        text-decoration: none;
        font-size: 13px; font-weight: 500;
        transition: all 0.15s ease;
        cursor: pointer;
        position: relative;
      }
      .anav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .anav-item.active { background: #2563eb; color: #fff; box-shadow: 0 4px 12px rgba(37,99,235,0.35); }
      .anav-item.disabled { opacity: 0.45; cursor: default; pointer-events: none; }
      .anav-icon { width: 18px; flex-shrink: 0; }
      .anav-badge {
        margin-left: auto;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 9px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.3px;
      }
      .anav-user {
        margin-top: auto;
        padding: 14px 18px;
        border-top: 1px solid rgba(255,255,255,0.08);
        display: flex; align-items: center; gap: 10px;
      }
      .anav-avatar {
        width: 32px; height: 32px; border-radius: 50%;
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; font-weight: 700; color: white; flex-shrink: 0;
      }
      .anav-user-info { flex: 1; min-width: 0; }
      .anav-user-name { font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .anav-user-role { font-size: 10px; color: rgba(255,255,255,0.45); }
      .anav-logout {
        background: none; border: none; cursor: pointer;
        color: rgba(255,255,255,0.4); padding: 4px;
        border-radius: 4px; transition: color 0.15s;
      }
      .anav-logout:hover { color: #ef4444; }
      /* Layout: le contenu de la page doit avoir margin-left: 240px */
      body.app-page { margin: 0; padding: 0; background: #f3f4f6; }
      .app-content { margin-left: 240px; min-height: 100vh; }
    </style>
  `;

  function getCurrentRoute() {
    return window.location.pathname;
  }

  function renderNavbar() {
    const modules = window.ACTUWISE_MODULES || [];
    const currentRoute = getCurrentRoute();
    const userName = window.ACTUWISE_USER || 'Actuaire';
    const initials = userName.substring(0, 2).toUpperCase();

    let html = BASE_CSS + `<a class="anav-logo" href="/home">
      <div class="anav-logo-icon">A</div>
      <div class="anav-logo-text">
        <div class="anav-logo-name">ACTUWISE</div>
        <div class="anav-logo-sub">Plateforme Actuarielle</div>
      </div>
    </a>`;

    modules.forEach(section => {
      html += `<div class="anav-section-label">${section.section}</div>`;
      section.items.forEach(item => {
        const isActive = currentRoute === item.route ||
          (item.route !== '/home' && currentRoute.startsWith(item.route.replace('/dashboard','').replace('/','/')));
        const cls = [
          'anav-item',
          isActive ? 'active' : '',
          !item.enabled ? 'disabled' : ''
        ].filter(Boolean).join(' ');

        const badgeHtml = item.badge
          ? `<span class="anav-badge" style="background:${item.badge.color}22;color:${item.badge.color};border:1px solid ${item.badge.color}44;">${item.badge.text}</span>`
          : '';

        html += `<a class="${cls}" href="${item.enabled ? item.route : '#'}">
          <span class="anav-icon">${item.icon}</span>
          <span>${item.label}</span>
          ${badgeHtml}
        </a>`;
      });
    });

    html += `<div class="anav-user">
      <div class="anav-avatar">${initials}</div>
      <div class="anav-user-info">
        <div class="anav-user-name">${userName}</div>
        <div class="anav-user-role">Actuaire</div>
      </div>
      <button class="anav-logout" onclick="window.doLogout()" title="Déconnexion">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </div>`;

    const container = document.getElementById('app-navbar');
    if (container) container.innerHTML = html;
  }

  // Injecter au chargement DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNavbar);
  } else {
    renderNavbar();
  }
})();
