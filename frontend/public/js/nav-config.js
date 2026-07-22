/**
 * nav-config.js — Configuration partagée des modules ACTUWISE
 * Ce fichier est la source unique de vérité pour la liste des modules,
 * utilisée par la navbar de l'app et la sidebar du dashboard.
 */
window.ACTUWISE_MODULES = [
  {
    section: 'Tableau de Bord',
    items: [
      {
        id: 'overview',
        label: 'Vue Générale',
        route: '/dashboard',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
        badge: null,
        enabled: true
      }
    ]
  },
  {
    section: 'Modules Actuariels',
    items: [
      {
        id: 'sinistralite',
        label: 'Sinistralité',
        route: '/sinistralite',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
        badge: { text: 'M1', color: '#2563eb' },
        enabled: true
      },
      {
        id: 'provisionnement',
        label: 'Provisionnement',
        route: '/provisionnement',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
        badge: { text: 'M2', color: '#2563eb' },
        enabled: true
      },
      {
        id: 'modelisation',
        label: 'Modélisation',
        route: '/modelisation',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        badge: { text: 'M3', color: '#2563eb' },
        enabled: true
      },
      {
        id: 'series',
        label: 'Séries Temporelles',
        route: '/series-temporelles',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
        badge: { text: 'M4', color: '#6b7280' },
        enabled: false
      },
      {
        id: 'ratio',
        label: 'Ratio Combiné',
        route: '/ratio-combine',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
        badge: { text: 'M5', color: '#2563eb' },
        enabled: true
      },
      {
        id: 'tarification',
        label: 'Bonus Malus',
        route: '/bonus-malus',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="14"></line><line x1="12" y1="14" x2="12" y2="14"></line><line x1="8" y1="14" x2="8" y2="14"></line></svg>`,
        badge: { text: 'New', color: '#2563eb' },
        enabled: true
      },
      {
        id: 'assistant',
        label: 'Assistant IA',
        route: '/assistant-ia',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`,
        badge: { text: 'IA', color: '#7c3aed' },
        enabled: true
      }
    ]
  }
];
