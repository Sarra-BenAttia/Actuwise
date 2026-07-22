const testDiv = document.createElement('div');
testDiv.style.position = 'fixed';
testDiv.style.top = '50px';
testDiv.style.left = '50%';
testDiv.style.transform = 'translateX(-50%)';
testDiv.style.background = 'blue';
testDiv.style.color = 'white';
testDiv.style.padding = '20px';
testDiv.style.zIndex = '99999';
testDiv.style.fontSize = '24px';
testDiv.innerHTML = 'JAVASCRIPT IS RUNNING!';
document.body.appendChild(testDiv);
/**
 * dashboard-dynamic.js — ACTUWISE
 * Charge dynamiquement toutes les données depuis le backend FastAPI
 * et rend les graphiques ApexCharts avec les vraies données des modèles.
 */

const NAVY    = '#0f2d5e';
const BLUE    = '#1a56db';
const ACCENT  = '#f9b800';
const SUCCESS = '#16a34a';
const DANGER  = '#dc2626';
const WARN    = '#d97706';
const MUTED   = '#94a3b8';

const BASE_CHART = {
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    animations: { enabled: true, easing: 'easeinout', speed: 700 },
    background: 'transparent'
  },
  dataLabels: { enabled: false },
  tooltip: { style: { fontSize: '11px' } },
  grid: { borderColor: '#f1f5f9', strokeDashArray: 4, padding: { left: 4, right: 4 } }
};

// ── Cache des données ──────────────────────────────────────────
const CACHE = {};
// ── Instances ApexCharts actives ───────────────────────────────
const CHARTS = {};
// ── Modules déjà rendus ────────────────────────────────────────
const RENDERED = new Set();

// ══════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════
function showErrorOnScreen(msg) {
  const errDiv = document.createElement('div');
  errDiv.style.position = 'fixed';
  errDiv.style.top = '10px';
  errDiv.style.left = '50%';
  errDiv.style.transform = 'translateX(-50%)';
  errDiv.style.background = 'red';
  errDiv.style.color = 'white';
  errDiv.style.padding = '10px';
  errDiv.style.zIndex = '9999';
  errDiv.innerHTML = msg;
  document.body.appendChild(errDiv);
}

async function api(endpoint) {
  if (CACHE[endpoint]) return CACHE[endpoint];
  try {
    const res  = await fetch('http://127.0.0.1:8000/api/' + endpoint);
    if (!res.ok) {
      showErrorOnScreen('API HTTP Error: ' + res.status + ' for ' + endpoint);
      console.warn('API HTTP Error:', res.status, endpoint);
      return null;
    }
    const json = await res.json();
    const data = json.status === 'ok' ? json.data : null;
    if (data) CACHE[endpoint] = data;
    return data;
  } catch (e) {
    showErrorOnScreen('API Fetch Error for ' + endpoint + ' : ' + e.message);
    console.warn('API Fetch Error:', e);
    return null;
  }
}

function el(id) { return document.getElementById(id); }

function setHTML(id, html) {
  const node = el(id);
  if (node) node.innerHTML = html;
}

/** Crée ou remplace un graphique ApexCharts */
function chart(id, opts) {
  const node = el(id);
  if (!node) return;
  if (CHARTS[id]) {
    try { CHARTS[id].destroy(); } catch(e) {}
    delete CHARTS[id];
  }
  node.innerHTML = '';
  CHARTS[id] = new ApexCharts(node, Object.assign({}, BASE_CHART, opts));
  CHARTS[id].render();
}

// ══════════════════════════════════════════════════════════════
// MODULE : VUE GÉNÉRALE  (overview)
// ══════════════════════════════════════════════════════════════
async function renderOverview() {
  const [kpis, sin] = await Promise.all([api('kpis'), api('sinistralite')]);
  showErrorOnScreen('KPIs loaded: ' + (kpis ? 'YES' : 'NO') + ' | SIN loaded: ' + (sin ? 'YES' : 'NO'));
  console.log('KPIs:', kpis); console.log('SIN:', sin);

  // ── KPIs cards ──────────────────────────────────────────────
  if (sin && sin.par_annee && sin.par_annee.length) {
    const an23 = sin.par_annee.find(a => a.annee === 2023);
    const an22 = sin.par_annee.find(a => a.annee === 2022);
    const totalSin = sin.par_annee.reduce((s, a) => s + (a.nb_sinistres || 0), 0);

    if (an23) {
      setHTML('kpi-primes-value', totalSin.toLocaleString('fr'));
      setHTML('kpi-sinistres-value', (an23.nb_sinistres || 0).toLocaleString('fr'));

      if (an22) {
        const d = ((an23.nb_sinistres - an22.nb_sinistres) / an22.nb_sinistres * 100).toFixed(1);
        const cl = d >= 0 ? 'trend up' : 'trend down-good';
        const ar = d >= 0 ? '▲' : '▼';
        setHTML('kpi-sinistres-trend', '<span class="' + cl + '">' + ar + ' ' + Math.abs(d) + '%</span>');
      }

      const freq = (an23.nb_sinistres / totalSin * 100).toFixed(1);
      setHTML('kpi-frequence-value', freq + '<small>%</small>');

      if (an23.cout_total && an23.nb_sinistres) {
        const cm = Math.round(an23.cout_total / an23.nb_sinistres);
        setHTML('kpi-cout-moyen-value', cm.toLocaleString('fr') + '<small> TND</small>');
      }
    }
  }

  if (kpis && kpis.ibnr_total && kpis.ibnr_total.valeur) {
    const m = (kpis.ibnr_total.valeur / 1000000).toFixed(2);
    setHTML('kpi-ibnr-value', m + '<small> M TND</small>');
  }
  if (kpis && kpis.ratio_combine_2023 && kpis.ratio_combine_2023.valeur) {
    setHTML('kpi-ratio-value', kpis.ratio_combine_2023.valeur + '<small>%</small>');
  }

  // ── Charts ──────────────────────────────────────────────────
  if (sin && sin.serie_mensuelle && sin.serie_mensuelle.length) {
    const d23 = sin.serie_mensuelle.filter(x => x.annee === 2023);
    const mL  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

    if (d23.length) chart('chart-mensuel', {
      chart: Object.assign({}, BASE_CHART.chart, { type: 'bar', height: 180 }),
      series: [{ name: 'Sinistres 2023', data: d23.map(x => x.nb_sinistres) }],
      colors: [BLUE],
      plotOptions: { bar: { borderRadius: 3, columnWidth: '65%' } },
      xaxis: { categories: mL, labels: { style: { fontSize: '9px' } } },
      yaxis: { labels: { style: { fontSize: '10px' }, formatter: v => v.toLocaleString('fr') } }
    });
  }

  if (sin && sin.par_annee && sin.par_annee.length) {
    const an = sin.par_annee;
    chart('chart-evolution', {
      chart: Object.assign({}, BASE_CHART.chart, { type: 'area', height: 200 }),
      series: [{ name: 'Coût sinistres (M TND)', data: an.map(a => +(a.cout_total/1000000).toFixed(2)) }],
      colors: [NAVY],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
      stroke: { curve: 'smooth', width: 2.5 },
      markers: { size: 4, strokeColors: '#fff', strokeWidth: 2 },
      xaxis: { categories: an.map(a => a.annee), labels: { style: { fontSize: '10px' } } },
      yaxis: { labels: { style: { fontSize: '10px' }, formatter: v => v.toFixed(1) + ' M' } }
    });
  }

  if (sin && sin.par_garantie && sin.par_garantie.length) {
    const g = sin.par_garantie;
    chart('chart-garantie', {
      chart: Object.assign({}, BASE_CHART.chart, { type: 'donut', height: 200 }),
      series: g.map(x => Math.round(x.cout_total)),
      labels: g.map(x => x.garantie),
      colors: [NAVY, BLUE, '#3b82f6', '#60a5fa', '#bfdbfe'],
      plotOptions: { pie: { donut: { size: '60%', labels: {
        show: true,
        total: { show: true, label: 'Total', fontSize: '10px', color: '#64748b',
          formatter: () => (g.reduce((s,x)=>s+x.cout_total,0)/1000000).toFixed(1) + ' M'
        }
      } } } },
      legend: { position: 'bottom', fontSize: '10px', itemMargin: { horizontal: 5 } }
    });
  }

  // Ajout du graphique par région
  if (sin && sin.par_region && sin.par_region.length) {
    const r = sin.par_region;
    chart('chart-regions', {
      chart: Object.assign({}, BASE_CHART.chart, { type: 'bar', height: 200 }),
      series: [{ name: 'Coût total (M TND)', data: r.map(x => +(x.cout_total/1000000).toFixed(2)) }],
      colors: [BLUE],
      plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '65%', distributed: true } },
      xaxis: { labels: { style: { fontSize: '9px' } } },
      yaxis: { categories: r.map(x => x.region), labels: { style: { fontSize: '10px' } } },
      legend: { show: false }
    });
  }

  if (sin && sin.ratio_combine_annuel && sin.ratio_combine_annuel.length) {
    const rc = sin.ratio_combine_annuel;
    chart('chart-ratio-years', {
      chart: Object.assign({}, BASE_CHART.chart, { type: 'line', height: 180 }),
      series: [
        { name: 'Ratio sinistres', type: 'bar',  data: rc.map(a => a.ratio_sinistres) },
        { name: 'Ratio combiné',   type: 'line', data: rc.map(a => a.ratio_combine) }
      ],
      colors: [BLUE, NAVY],
      stroke: { width: [0, 3], curve: 'smooth' },
      plotOptions: { bar: { borderRadius: 3, columnWidth: '50%' } },
      annotations: { yaxis: [{ y: 100, borderColor: DANGER, strokeDashArray: 6,
        label: { text: 'Seuil 100%', style: { fontSize: '9px', color: DANGER }, position: 'left' }
      }] },
      xaxis: { categories: rc.map(a => a.annee), labels: { style: { fontSize: '10px' } } },
      yaxis: { min: 70, max: 110, labels: { style: { fontSize: '10px' }, formatter: v => v + '%' } },
      legend: { fontSize: '10px' }
    });
  }
}

// ══════════════════════════════════════════════════════════════
// DISPATCHER
// ══════════════════════════════════════════════════════════════
window.renderChartsForModule = function(name) {
  if (RENDERED.has(name)) {
    Object.values(CHARTS).forEach(c => { try { c.render(); } catch(e){} });
    return;
  }
  RENDERED.add(name);

  switch(name) {
    case 'overview':        renderOverview();        break;
    case 'sinistralite':    renderSinistralite();    break;
    case 'provisionnement': renderProvisionnement(); break;
    case 'modelisation':    renderModelisation();    break;
    case 'ratio':           renderRatio();           break;
  }
};

(async function init() {
  await Promise.allSettled([
    api('sinistralite'),
    api('kpis')
  ]);

  const activePanel = document.querySelector('.section-panel.active');
  const activeName  = activePanel ? activePanel.id.replace('panel-', '') : 'overview';
  window.renderChartsForModule(activeName);

  console.log('[ACTUWISE] Données chargées, graphiques prêts.');
})();




