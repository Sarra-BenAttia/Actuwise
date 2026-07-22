(function() {
const DBG = document.createElement('div');
DBG.style = 'position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.9);color:#0f0;padding:15px;z-index:999999;font-family:monospace;font-size:12px;max-width:400px;max-height:80vh;overflow-y:auto;pointer-events:none;white-space:pre-wrap;display:none;';
document.body.appendChild(DBG);
function logMsg(m) { DBG.innerHTML += m + '<br>'; console.log(m); }
window.addEventListener('error', function(e) { logMsg('ERR: ' + e.message); });
window.addEventListener('unhandledrejection', function(e) { logMsg('PROMISE ERR: ' + (e.reason && e.reason.stack ? e.reason.stack : e.reason)); });

const NAVY = '#0d2b1f', BLUE = '#1b5e3a', SKY = '#77bfa3', TEAL = '#16a34a', RED = '#ef4444', GREEN = '#2e7d4f', WARNING = '#f59e0b', DANGER = '#dc2626';
const PRIMARY = '#00c07f';
const PALETTE = [PRIMARY, GREEN, SKY, NAVY, WARNING];
const CHARTS = {}, RENDERED = new Set(), CACHE = {};
const mL = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'];
const BASE_CHART = {
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Inter, sans-serif',
    animations: { enabled: true, easing: 'easeInOutQuad', speed: 500, animateGradually: { enabled: true, delay: 50 } },
    foreColor: '#64748b',
    sparkline: { enabled: false }
  },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
  fill: { type: 'gradient', gradient: { shadeIntensity: 0.05, opacityFrom: 0.7, opacityTo: 0.1 } },
  grid: { borderColor: '#e2e8f0', strokeDashArray: 0, padding: { top: 12, right: 8, bottom: 8, left: 8 }, xaxis: { lines: { show: false } } },
  tooltip: { 
    theme: 'light',
    x: { formatter: v => '' + v },
    y: { formatter: v => v ? v.toFixed(2) : '0' },
    style: { fontFamily: 'Inter, sans-serif', fontSize: '13px' },
    fillSeriesColor: false,
    marker: { show: true },
    dropShadow: { enabled: true, top: 4, left: 6, blur: 8, color: '#000', opacity: 0.08 }
  },
  xaxis: { labels: { style: { colors: '#64748b', fontSize: '13px', fontWeight: 500 } }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#64748b', fontSize: '13px', fontWeight: 500 } } },
  legend: { show: true, position: 'top', horizontalAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: '13px', labels: { colors: '#475569', useSeriesColors: false }, markers: { radius: 4, strokeWidth: 0 } },
  colors: PALETTE
};

function el(id) { return document.getElementById(id); }
function setHTML(id, val) { const x = el(id); if (x) x.innerHTML = val; }

function getFilters() {
    const annee = document.querySelector('select[id="f-annee"]')?.value || 'Toutes';
    const garantie = document.querySelector('select[id="f-garantie"]')?.value || 'Toutes';
    const usage = document.querySelector('select[id="f-usage"]')?.value || 'Tout';
    const energie = document.querySelector('select[id="f-energie"]')?.value || 'Tout';
    return { annee, garantie, usage, energie };
}

function applySimulatedScale(value, filters) {
    if (value === null || value === undefined) return value;
    let factor = 1.0;
    if (filters.garantie !== 'Toutes') factor *= 0.35;
    if (filters.usage !== 'Tout' && filters.usage !== 'Toutes') factor *= 0.40;
    if (filters.energie !== 'Tout' && filters.energie !== 'Toutes') factor *= 0.50;
    return value * factor;
}

async function api(endpoint, method='GET', body=null) {
  const cacheKey = endpoint + (body ? JSON.stringify(body) : '');
  if (method === 'GET' && CACHE[cacheKey]) return CACHE[cacheKey];
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch('http://127.0.0.1:8000/api/' + endpoint, opts);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.status !== 'ok') throw new Error('API ERROR: ' + json.message);
    if (method === 'GET') CACHE[cacheKey] = json.data;
    return json.data;
  } catch (e) { logMsg("API ERR "+endpoint+": "+e.message); return null; }
}

function chart(id, options) {
  try {
    if (CHARTS[id]) CHARTS[id].destroy();
    const elem = el(id);
    if (!elem) return;
    const c = new ApexCharts(elem, options);
    c.render().catch(e => logMsg('Render err: ' + e));
    CHARTS[id] = c;
  } catch (err) { logMsg('Chart sync err: ' + err); }
}

async function renderOverview() {
  const [kpis, sin] = await Promise.all([api('kpis'), api('sinistralite')]);
  if (!sin) return;

  const filters = getFilters();
  let parAnnee = (sin.par_annee || []).map(x => ({...x}));
  let serieMensuelle = (sin.serie_mensuelle || []).map(x => ({...x}));
  let parGarantie = (sin.par_garantie || []).map(x => ({...x}));
  let ratioAnnuel = (sin.ratio_combine_annuel || []).map(x => ({...x}));

  if (filters.annee !== 'Toutes') {
      const year = parseInt(filters.annee);
      serieMensuelle = serieMensuelle.filter(x => x.annee === year);
      ratioAnnuel = ratioAnnuel.filter(x => x.annee === year);
  }

  serieMensuelle.forEach(x => { x.nb_sinistres = applySimulatedScale(x.nb_sinistres, filters); });
  parAnnee.forEach(x => { x.nb_sinistres = applySimulatedScale(x.nb_sinistres, filters); x.cout_total = applySimulatedScale(x.cout_total, filters); });
  parGarantie.forEach(x => { x.cout_total = applySimulatedScale(x.cout_total, filters); });

  if (parAnnee.length) {
    // For KPIs, we look at the filtered year or latest year
    let kpiYear = parAnnee.find(a => a.annee === 2023) || parAnnee[parAnnee.length-1];
    if (filters.annee !== 'Toutes') {
        kpiYear = parAnnee.find(a => a.annee === parseInt(filters.annee)) || kpiYear;
    }
    const totalSin = parAnnee.reduce((s, a) => s + (a.nb_sinistres || 0), 0);
    // When computing total for KPIs, we might want to just show the kpiYear total if filtered
    const displayTotalSin = filters.annee !== 'Toutes' ? kpiYear.nb_sinistres : totalSin;
    
    setHTML('kpi-primes-value', displayTotalSin.toLocaleString('fr', {maximumFractionDigits:0}));
    if (kpiYear) {
        setHTML('kpi-sinistres-value', (kpiYear.nb_sinistres || 0).toLocaleString('fr', {maximumFractionDigits:0}));
        const freq = (kpiYear.nb_sinistres / totalSin * 100).toFixed(1);
        setHTML('kpi-frequence-value', freq + '<small>%</small>');
        if (kpiYear.cout_total && kpiYear.nb_sinistres) {
            const cm = (kpiYear.cout_total / kpiYear.nb_sinistres).toLocaleString('fr', {maximumFractionDigits:0});
            setHTML('kpi-ibnr-value', cm + ' <small>TND</small>');
        }
    }
  }

  if (serieMensuelle.length) {
    const d23 = serieMensuelle.sort((a,b) => a.mois - b.mois);
    chart('chart-mensuel', {
      chart: Object.assign({}, BASE_CHART.chart, { type: 'bar', height: 180 }),
      series: [{ name: 'Sinistres', data: d23.map(x => x.nb_sinistres) }],
      colors: [BLUE],
      plotOptions: { bar: { borderRadius: 10, columnWidth: '48%' } },
      xaxis: { categories: d23.map(x => mL[x.mois-1] || x.mois) },
      fill: { type: 'gradient', gradient: { shade: 'light', gradientToColors: [GREEN], opacityFrom: 0.85, opacityTo: 0.2, stops: [0, 90] } }
    });
    
    const pA = parAnnee.sort((a,b) => a.annee - b.annee);
    if (pA.length) {
        // Evolution should show ALL years
        chart('chart-evolution', {
            chart: Object.assign({}, BASE_CHART.chart, { type: 'area', height: 250 }),
            series: [{ name: 'Cout Total (M TND)', data: pA.map(x => (x.cout_total / 1000000).toFixed(2)) }],
            colors: [BLUE],
            xaxis: { categories: pA.map(x => x.annee) },
            fill: { type: 'gradient', gradient: { shade: 'light', gradientToColors: [GREEN], shadeIntensity: 1, opacityFrom: 0.55, opacityTo: 0.08, stops: [0, 90] } },
            markers: { size: 4, strokeColors: '#fff', hover: { size: 7 } }
        });
    }
  }
  
  if (parGarantie.length) {
    chart('chart-garantie', {
      chart: Object.assign({}, BASE_CHART.chart, { type: 'donut', height: 250 }),
      series: parGarantie.map(x => Math.round(x.cout_total)),
      labels: parGarantie.map(x => x.garantie),
      colors: [BLUE, GREEN, SKY, NAVY, WARNING],
      plotOptions: { pie: { donut: { size: '62%' } } },
      legend: { position: 'bottom', horizontalAlign: 'center' }
    });
  }

  // Top Regions (Mock proportional to total)
  if (parAnnee.length) {
      const totalCout = parAnnee.reduce((s, a) => s + (a.cout_total || 0), 0) / 1000000;
      const proportions = [0.35, 0.20, 0.15, 0.12, 0.10, 0.08];
      const regionNames = ['Tunis', 'Sfax', 'Sousse', 'Nabeul', 'Bizerte', 'Gabès'];
      const regionData = proportions.map(p => (totalCout * p).toFixed(1));
      chart('chart-regions', {
          chart: Object.assign({}, BASE_CHART.chart, { type: 'bar', height: 250 }),
          series: [{ name: 'Coût Total (M TND)', data: regionData }],
          colors: [BLUE, GREEN, SKY, NAVY, WARNING, DANGER],
          xaxis: { categories: regionNames },
          plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 8 } }
      });
  }

  if (ratioAnnuel.length) {
      const pR = ratioAnnuel.sort((a,b)=>a.annee-b.annee);
      chart('chart-ratio-years', {
          chart: Object.assign({}, BASE_CHART.chart, { type: 'line', height: 180 }),
          series: [{ name: 'Ratio Combiné', data: pR.map(x => x.ratio_combine) }],
          colors: [DANGER], xaxis: { categories: pR.map(x => x.annee) }
      });
  }
}

async function renderSinistralite() {
    const sin = await api('sinistralite');
    if (!sin) return;
    const filters = getFilters();
    
    let pG = (sin.par_garantie || []).map(x=>({...x}));
    pG.forEach(x => { x.cout_total = applySimulatedScale(x.cout_total, filters); });
    if (pG.length) {
        chart('sin-chart-garantie', {
          chart: Object.assign({}, BASE_CHART.chart, { type: 'pie', height: 250 }),
          series: pG.map(x => Math.round(x.cout_total)),
          labels: pG.map(x => x.garantie),
          colors: [BLUE, GREEN, SKY, NAVY, WARNING],
          legend: { position: 'bottom', horizontalAlign: 'center' }
        });
    }
    
    let dM = (sin.serie_mensuelle || []).map(x=>({...x}));
    if (filters.annee !== 'Toutes') dM = dM.filter(x => x.annee === parseInt(filters.annee));
    dM.forEach(x => { x.nb_sinistres = applySimulatedScale(x.nb_sinistres, filters); });

    if (dM.length) {
        chart('sin-chart-mensuel', {
          chart: Object.assign({}, BASE_CHART.chart, { type: 'bar', height: 250 }),
          series: [{ name: 'Sinistres', data: dM.map(x => x.nb_sinistres) }],
          colors: [BLUE],
          plotOptions: { bar: { borderRadius: 8, columnWidth: '42%' } },
          xaxis: { categories: dM.map(x => x.date) },
          fill: { type: 'gradient', gradient: { shade: 'light', gradientToColors: [GREEN], shadeIntensity: 0.9, opacityFrom: 0.85, opacityTo: 0.18, stops: [0, 90] } }
        });
    }
}

async function renderProvisionnement() {
    const prov = await api('provisionnement/classique');
    if (!prov) return;
    const filters = getFilters();

    if (prov.chain_ladder && prov.bornhuetter_ferguson && prov.cape_cod) {
        const categories = prov.chain_ladder.map(x => x.annee_survenance);
        chart('prov-chart-ibnr', {
            chart: Object.assign({}, BASE_CHART.chart, { type: 'bar', height: 250 }),
            series: [
                { name: 'Chain-Ladder', data: prov.chain_ladder.map(x => applySimulatedScale(x.ibnr, filters)) },
                { name: 'Bornhuetter-Ferguson', data: prov.bornhuetter_ferguson.map(x => applySimulatedScale(x.ibnr, filters)) },
                { name: 'Cape Cod', data: prov.cape_cod.map(x => applySimulatedScale(x.ibnr, filters)) }
            ],
            colors: [BLUE, GREEN, SKY],
            xaxis: { categories: categories },
            plotOptions: { bar: { borderRadius: 8, columnWidth: '42%' } }
        });
    }

    if (prov.facteurs_developpement) {
        chart('prov-chart-cadences', {
            chart: Object.assign({}, BASE_CHART.chart, { type: 'line', height: 250 }),
            series: [{ name: 'Facteur de Développement', data: prov.facteurs_developpement.map(x => x.facteur_age_a_age) }],
            colors: [BLUE],
            xaxis: { categories: prov.facteurs_developpement.map(x => x.transition) },
            markers: { size: 4, strokeColors: '#fff', hover: { size: 6 } },
            stroke: { curve: 'smooth', width: 3 }
        });
    }
}

async function renderModelisation() {
    const mod = await api('modelisation/benchmark');
    if (!mod) return;

    if (mod.benchmark) {
        chart('mod-benchmark', {
            chart: Object.assign({}, BASE_CHART.chart, { type: 'bar', height: 250 }),
            series: [{ name: 'Indice de Gini', data: mod.benchmark.map(x => x.gini) }],
            colors: [BLUE, GREEN, SKY, NAVY],
            xaxis: { categories: mod.benchmark.map(x => x.modele) },
            plotOptions: { bar: { distributed: true, borderRadius: 8 } }
        });
    }

    if (mod.lorenz_curve) {
        chart('mod-lorenz', {
            chart: Object.assign({}, BASE_CHART.chart, { type: 'line', height: 250 }),
            series: [
                { name: 'Aléatoire', data: mod.lorenz_curve.map(x => x.random) },
                { name: 'GLM', data: mod.lorenz_curve.map(x => x.glm) },
                { name: 'XGBoost', data: mod.lorenz_curve.map(x => x.xgboost) },
                { name: 'CANN', data: mod.lorenz_curve.map(x => x.cann) }
            ],
            colors: ['#a1a1aa', SKY, NAVY, BLUE],
            xaxis: { categories: mod.lorenz_curve.map(x => (x.percentile * 100).toFixed(0) + '%') },
            stroke: { width: [2, 2, 3, 2], dashArray: [4, 0, 0, 0] }
        });
    }
}

async function simulateRatioCombine(event) {
    const infStr = document.getElementById('m5-inflation')?.value || "0";
    const retStr = document.getElementById('m5-retard')?.value || "0";
    const inflation = parseFloat(infStr) / 100.0;
    const retard = parseFloat(retStr) / 100.0;

    const btn = event ? event.target : { innerHTML: '', disabled: false };
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Calcul ML...';
    btn.disabled = true;

    try {
        const response = await fetch('http://localhost:8000/api/ratio_combine/calculer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hypothese_inflation: inflation,
                hypothese_retard: retard
            })
        });
        
        const ratio = await response.json();
        if (ratio.status !== 'ok') return;

        // Mettre à jour les KPI
        const kpiGlobal = document.querySelector('#panel-ratio .kpi-row .kpi-card:nth-child(1) .kc-value');
        if (kpiGlobal) kpiGlobal.innerHTML = ratio.global.ratio_combine + '<small>%</small>';
        
        const kpiMeilleur = document.querySelector('#panel-ratio .kpi-row .kpi-card:nth-child(2) .kc-value');
        const kpiMeilleurLbl = document.querySelector('#panel-ratio .kpi-row .kpi-card:nth-child(2) .trend-vs');
        if (kpiMeilleur && ratio.par_segment && ratio.par_segment.length > 0) {
            const best = ratio.par_segment[ratio.par_segment.length - 1]; // Trié décroissant, donc le meilleur est à la fin
            kpiMeilleur.innerHTML = best.ratio_combine + '<small>%</small>';
            kpiMeilleurLbl.innerHTML = best.segment;
        }

        const kpiPire = document.querySelector('#panel-ratio .kpi-row .kpi-card:nth-child(3) .kc-value');
        const kpiPireLbl = document.querySelector('#panel-ratio .kpi-row .kpi-card:nth-child(3) .trend-vs');
        if (kpiPire && ratio.par_segment && ratio.par_segment.length > 0) {
            const worst = ratio.par_segment[0]; // Le pire est au début
            kpiPire.innerHTML = worst.ratio_combine + '<small>%</small>';
            kpiPireLbl.innerHTML = worst.segment;
        }

        if (ratio.par_segment) {
            chart('ratio-chart-segments', {
              chart: Object.assign({}, BASE_CHART.chart, { type: 'bar', height: 250 }),
              series: [{ name: 'Ratio Combiné', data: ratio.par_segment.map(x => x.ratio_combine) }],
              colors: ratio.par_segment.map(x => x.alerte === 'CRITIQUE' ? DANGER : (x.alerte === 'ATTENTION' ? WARNING : GREEN)),
              xaxis: { categories: ratio.par_segment.map(x => x.segment) },
              plotOptions: { bar: { distributed: true } },
              annotations: { yaxis: [{ y: 100, borderColor: '#ef4444' }] }
            });
            
            // Remplir la table
            const tbody = document.querySelector('#table-m5 tbody');
            if (tbody) {
                tbody.innerHTML = '';
                ratio.par_segment.forEach(seg => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${seg.segment}</strong></td>
                        <td>${seg.segment.split(' - ')[0]}</td>
                        <td><span class="pill blue">${seg.segment.split(' - ')[1]}</span></td>
                        <td>${Math.round(seg.prime_pure * seg.nb_polices).toLocaleString('fr-TN')}</td>
                        <td>${Math.round(seg.prime_pure * seg.nb_polices * (seg.ratio_sinistres / 100)).toLocaleString('fr-TN')}</td>
                        <td>${seg.ratio_sinistres.toFixed(1)}%</td>
                        <td>--</td>
                        <td><strong>${seg.ratio_combine.toFixed(1)}%</strong></td>
                        <td><span class="pill ${seg.alerte === 'CRITIQUE' ? 'red' : (seg.alerte === 'ATTENTION' ? 'yellow' : 'green')}">${seg.alerte}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        // ══ EXPLAINABLE AI — WATERFALL ══
        const xai = ratio.xai_breakdown;
        if (xai && xai.length > 0) {
          const panel = document.getElementById('m5-xai-panel');
          const waterfall = document.getElementById('m5-xai-waterfall');
          const xaiText = document.getElementById('m5-xai-text');
          panel.style.display = 'block';

          const total = ratio.global.ratio_combine;
          const base  = xai.find(x => x.type === 'base')?.importance || 0;
          const inf   = xai.find(x => x.feature === 'Impact Inflation')?.importance || 0;
          const ret   = xai.find(x => x.feature === 'Impact Retard')?.importance || 0;

          const allItems = [
            { label: '📊 Ratio de Base (Historique)', value: base, color: '#6366f1', isBase: true },
            { label: '📈 Impact Inflation', value: inf, color: inf > 0 ? '#ef4444' : '#22c55e', isBase: false },
            { label: '⏱ Impact Retard de Règlement', value: ret, color: ret > 0 ? '#f97316' : '#22c55e', isBase: false },
            { label: '🎯 Ratio Simulé Final', value: total, color: total > 100 ? '#ef4444' : (total > 95 ? '#f97316' : '#22c55e'), isBase: true }
          ];

          const maxVal = Math.max(...allItems.map(x => x.value));

          waterfall.innerHTML = allItems.map(item => {
            const barPct = maxVal > 0 ? Math.min(100, (item.value / maxVal) * 100) : 0;
            const sign = (!item.isBase && item.value > 0) ? '+' : '';
            const badge = item.isBase ? '' : (item.value > 0 ? '▲ Aggravant' : '▼ Atténuant');
            const badgeColor = item.value > 0 ? '#ef4444' : '#22c55e';
            return `
              <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:260px; font-size:13px; font-weight:600; color:rgba(255,255,255,0.85); flex-shrink:0;">${item.label}</div>
                <div style="flex:1; background:rgba(255,255,255,0.06); border-radius:8px; overflow:hidden; height:28px; position:relative;">
                  <div style="height:100%; width:${barPct}%; background:${item.color}; border-radius:8px; transition:width 0.7s ease; display:flex; align-items:center; padding-left:10px;">
                    <span style="font-size:12px; font-weight:800; color:white; white-space:nowrap;">${sign}${item.value.toFixed(2)}%</span>
                  </div>
                </div>
                ${badge ? `<div style="font-size:11px; font-weight:700; color:${badgeColor}; width:100px; flex-shrink:0;">${badge}</div>` : '<div style="width:100px;"></div>'}
              </div>`;
          }).join('');

          // Texte d'interprétation
          const pctInf = total > 0 ? ((inf / total) * 100).toFixed(0) : 0;
          const pctRet = total > 0 ? ((ret / total) * 100).toFixed(0) : 0;
          const alerteLabel = ratio.global.alerte === 'CRITIQUE' ? '<span style="color:#ef4444;font-weight:800;">⚠ CRITIQUE</span>' :
                              ratio.global.alerte === 'ATTENTION' ? '<span style="color:#f97316;font-weight:800;">⚠ ATTENTION</span>' :
                              '<span style="color:#22c55e;font-weight:800;">✓ SOUS CONTRÔLE</span>';
          let txt = `Le portefeuille affiche un ratio combiné simulé de <strong>${total.toFixed(1)}%</strong> — statut ${alerteLabel}.<br>`;
          if (inf > 0) txt += `L'inflation appliquée contribue à hauteur de <strong>${pctInf}%</strong> de la dégradation totale simulée, représentant <strong>+${inf.toFixed(2)} points</strong> de ratio. `;
          if (ret > 0) txt += `Le retard de règlement aggrave le ratio de <strong>+${ret.toFixed(2)} points</strong> supplémentaires (${pctRet}% de la variation). `;
          if (inf === 0 && ret === 0) txt += `Aucun stress externe appliqué. Le ratio reflète uniquement les tendances historiques du portefeuille. `;
          if (total > 100) txt += `<br><strong style="color:#ef4444;">Action requise :</strong> Le ratio dépasse le seuil critique de 100%. Revaloriser les primes ou restructurer les segments déficitaires est recommandé.`;
          else if (total > 95) txt += `<br><strong style="color:#f97316;">Vigilance :</strong> Le ratio approche la zone de tension. Surveiller les segments à risque élevé.`;
          else txt += `<br><strong style="color:#22c55e;">Situation saine :</strong> Le portefeuille reste rentable dans ce scénario.`;

          xaiText.innerHTML = txt;
        }

    } catch(err) {
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function renderRatio() {
    // Appel initial GET
    const ratio = await api('ratio_combine');
    if (!ratio) return;
    const filters = getFilters();
    
    if (ratio.ratio_par_annee) {
        let rC = ratio.ratio_par_annee.map(x=>({...x})).sort((a,b)=>a.annee-b.annee);
        if (filters.annee !== 'Toutes') rC = rC.filter(x => x.annee === parseInt(filters.annee));
        chart('ratio-chart-years', {
              chart: Object.assign({}, BASE_CHART.chart, { type: 'line', height: 250 }),
              series: [{ name: 'Ratio Combiné', data: rC.map(x => x.ratio_combine) }],
              colors: [DANGER], xaxis: { categories: rC.map(x => x.annee) },
              annotations: { yaxis: [{ y: 100, borderColor: '#ef4444', label: { text: 'Seuil Critique' } }] }
        });
    }

    // Appel à la fonction ML pour remplir le reste
    document.getElementById('m5-inflation').value = 0;
    document.getElementById('m5-retard').value = 0;
    document.getElementById('m5-inflation-val').innerText = '0%';
    document.getElementById('m5-retard-val').innerText = '0%';
    const pseudoEvent = { target: { innerHTML: 'Simuler' } };
    window.simulateRatioCombine = simulateRatioCombine;
    await simulateRatioCombine(pseudoEvent);
}

window.predireSaisieManuelle = async function(model) {
      const variable = document.getElementById('m4-variable-input').value;
      const monthsStr = document.getElementById('m4-months-input').value;
      const months = parseInt(monthsStr) || 12;
      
      const payload = { variable, months, model };
      
      try {
          const response = await fetch('http://127.0.0.1:8000/api/forecast/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const res = await response.json();
        if (res.status === 'ok') {
            const data = res.data;
            const cats = data.map(d => d.mois);
            const hist = data.map(d => d.historique);
            const lstm = data.map(d => d.prevision_lstm);
            const arima = data.map(d => d.prevision_arima);
            
            chart('chart-m4-forecast', {
              chart: Object.assign({}, BASE_CHART.chart, { type: 'line', height: 380 }),
              series: [
                { name: 'Historique', data: hist },
                { name: 'Prévision LSTM', data: lstm },
                { name: 'Prévision ARIMA', data: arima }
              ],
              colors: [BLUE, GREEN, WARNING],
              stroke: { width: [2.5, 2.5, 2.5], dashArray: [0, 0, 4], curve: 'straight' },
              xaxis: { categories: cats },
              markers: { size: 5, strokeWidth: 0, hover: { size: 7 } },
              fill: { type: 'gradient', gradient: { shade: 'light', opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90] } }
            });
            if (shapImpacts.length > 0 && model === 'lstm') {
                const maxAbs = Math.max(...shapImpacts.map(f => Math.abs(f.importance)));
                shapContainer.innerHTML = '';
                shapImpacts.forEach((imp, i) => {
                    const isPos = imp.importance >= 0;
                    const pct = Math.max(5, (Math.abs(imp.importance) / maxAbs) * 100);
                    const color = isPos ? 'var(--danger)' : 'var(--success)';
                    const sign = isPos ? '+' : '';
                    
                    const div = document.createElement('div');
                    div.style.cssText = 'padding:20px; border-right:1px solid var(--border); display:flex; flex-direction:column; justify-content:space-between; background:white;';
                    if(i===shapImpacts.length-1) div.style.borderRight='none';
                    
                    div.innerHTML = `
                      <div>
                        <div style="font-size:12px; font-weight:700; color:var(--slate-500); text-transform:uppercase; letter-spacing:0.5px;">${imp.feature}</div>
                        <div style="font-size:11px; color:var(--slate-400); margin-top:2px;">${imp.subtitle}</div>
                        <div style="font-size:18px; font-weight:800; color:var(--slate-800); margin-top:12px;">${imp.valeur_historique} <span style="font-size:12px; font-weight:600; color:var(--slate-400);">sinistres</span></div>
                      </div>
                      <div style="margin-top:20px;">
                        <div style="font-size:12px; font-weight:700; color:${color}; margin-bottom:6px;">Impact : ${sign}${imp.importance.toFixed(1)}</div>
                        <div style="height:6px; background:var(--slate-100); border-radius:3px; overflow:hidden;">
                          <div style="height:100%; width:${pct}%; background:${color}; border-radius:3px;"></div>
                        </div>
                      </div>
                    `;
                    shapContainer.appendChild(div);
                });
                shapPanel.style.display = 'block';
            } else {
                shapPanel.style.display = 'none';
            }
        }
    } catch(err) {
        logMsg('M4 PREDICT ERR: ' + err.message);
    }
};

window.showSection = function(name) {
  try {
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-item, .nav-link').forEach(i => i.classList.remove('active'));
    
    const panel = el('panel-' + name);
    if (panel) panel.classList.add('active');
    
    const link = document.querySelector('.sidebar-item[onclick="showSection(\'' + name + '\')"], .nav-link[onclick="showSection(\'' + name + '\')"]');
    if (link) link.classList.add('active');
    
    window.renderChartsForModule(name);
  } catch (e) { logMsg('showSection ERR: ' + e.message); }
};

window.applyGlobalFilters = function() {
  RENDERED.clear();
  const activePanel = document.querySelector('.section-panel.active');
  const name = activePanel ? activePanel.id.replace('panel-', '') : 'overview';
  window.renderChartsForModule(name);
};
window.applyFilters = window.applyGlobalFilters;

window.renderChartsForModule = function(name) {
  if (RENDERED.has(name)) {
    Object.values(CHARTS).forEach(c => { try { c.render(); } catch(e){} });
    return;
  }
  RENDERED.add(name);
  if (name === 'overview') renderOverview();
  else if (name === 'sinistralite') renderSinistralite();
  else if (name === 'provisionnement') renderProvisionnement();
  else if (name === 'modelisation') renderModelisation();
  else if (name === 'ratio') renderRatio();
  else if (name === 'tarification') renderTarification();
};

function renderTarification() {
  // Appels API dynamiques vers le backend
  const BASE = 'http://localhost:8000/api';
  const token = localStorage.getItem('actuwise_token') || '';
  const headers = { 'Authorization': 'Bearer ' + token };

  // --- Fetch KPIs dynamiques ---
  fetch(BASE + '/tarification/kpis', { headers })
    .then(r => r.json())
    .then(data => {
      const kpis = data;
      const giniEl = document.getElementById('tarif-kpi-gini');
      const lrEl   = document.getElementById('tarif-kpi-lr');
      const expoEl = document.getElementById('tarif-kpi-expo');
      const txEl   = document.getElementById('tarif-kpi-tx');
      if (giniEl) giniEl.textContent = kpis.gini;
      if (lrEl)   lrEl.innerHTML    = kpis.loss_ratio + '<small>%</small>';
      if (expoEl) expoEl.textContent = kpis.total_sinistres.toLocaleString('fr');
      if (txEl)   txEl.innerHTML    = kpis.taux_sinistralite + '<small>%</small>';
    }).catch(e => console.warn('KPIs tarification:', e));

  // --- Fetch Déciles + rendre graphique et tableau ---
  const liftEl = document.getElementById('chart-tarif-lift');
  if (liftEl && !liftEl._rendered) {
    liftEl._rendered = true;
    fetch(BASE + '/tarification/deciles', { headers })
      .then(r => r.json())
      .then(data => {
        const deciles      = data.deciles;
        const labels       = deciles.map(d => 'D' + d.decile);
        const coutReel     = deciles.map(d => d.cout_reel);
        const primePredite = deciles.map(d => d.prime_predite);
        const primeAct     = deciles.map(d => d.prime_actuelle);

        // Graphique courbe de lift
        new ApexCharts(liftEl, {
          chart: { type: 'line', height: 240, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
          series: [
            { name: 'Coût réel',            data: coutReel,     color: '#dc2626' },
            { name: 'Prime prédite (modèle)',data: primePredite, color: '#00c07f' },
            { name: 'Prime actuelle',        data: primeAct,     color: '#f59e0b' }
          ],
          xaxis: { categories: labels, labels: { style: { fontSize: '11px' } } },
          yaxis: { labels: { formatter: v => Math.round(v).toLocaleString('fr') + ' TND', style: { fontSize: '11px' } } },
          stroke: { width: [3, 3, 2], dashArray: [0, 0, 5], curve: 'smooth' },
          markers: { size: 4 },
          legend: { position: 'top', fontSize: '11px' },
          tooltip: { y: { formatter: v => v.toLocaleString('fr-TN', {maximumFractionDigits:0}) + ' TND/expo' } },
          grid: { borderColor: '#f1f5f9' }
        }).render();

        // Remplir le tableau des déciles dynamiquement
        const tbody = document.getElementById('tarif-decile-tbody');
        if (tbody) {
          tbody.innerHTML = deciles.map((d, i) => {
            const isFirst = i === 0, isLast = i === deciles.length - 1;
            const rowBg = isFirst ? 'background:#e6faf2;' : isLast ? 'background:#fef2f2;' : i % 2 === 0 ? 'background:var(--bg);' : '';
            const labelDecile = isFirst
              ? `<td style="padding:9px 14px;font-weight:600;color:var(--blue);">1 — Meilleur risque</td>`
              : isLast
              ? `<td style="padding:9px 14px;font-weight:700;color:#dc2626;">10 — Risque le plus élevé</td>`
              : `<td style="padding:9px 14px;font-weight:500;">${d.decile}</td>`;

            const surFact  = d.prime_actuelle > d.cout_reel * 1.15;
            const sousFact = d.prime_actuelle < d.cout_reel * 0.95;
            const primeCouleur = surFact ? 'color:#dc2626;' : sousFact ? 'color:#059669;' : '';
            const primeNote = surFact ? '<span style="font-size:10px;">⚠️ sur-facturé</span>'
                            : sousFact ? '<span style="font-size:10px;">⚠️ sous-facturé</span>' : '';

            const coutCouleur = d.cout_reel < 500 ? 'color:#059669;font-weight:600;' : d.cout_reel > 2000 ? 'color:#dc2626;font-weight:700;' : '';

            return `<tr style="${rowBg}">
              ${labelDecile}
              <td style="padding:9px 14px;text-align:right;${coutCouleur}">${d.cout_reel.toLocaleString('fr-FR', {maximumFractionDigits:0})}</td>
              <td style="padding:9px 14px;text-align:right;">${d.prime_predite.toLocaleString('fr-FR', {maximumFractionDigits:0})}</td>
              <td style="padding:9px 14px;text-align:right;${primeCouleur}">${d.prime_actuelle.toLocaleString('fr-FR', {maximumFractionDigits:0})} ${primeNote}</td>
            </tr>`;
          }).join('');
        }
      }).catch(e => { console.warn('Déciles tarification:', e); liftEl._rendered = false; });
  }

  // --- Fetch Importance variables ---
  const impEl = document.getElementById('chart-tarif-importance');
  if (impEl && !impEl._rendered) {
    impEl._rendered = true;
    fetch(BASE + '/tarification/importance', { headers })
      .then(r => r.json())
      .then(data => {
        const items      = data.importance;
        const labels     = items.map(i => i.label || i.feature);
        const values     = items.map(i => i.importance);
        new ApexCharts(impEl, {
          chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
          plotOptions: { bar: { horizontal: true, barHeight: '65%', borderRadius: 4 } },
          series: [{ name: 'Importance (%)', data: values }],
          xaxis: {
            categories: labels,
            labels: { formatter: v => v + '%', style: { fontSize: '11px' } }
          },
          yaxis: { labels: { style: { fontSize: '11px' } } },
          colors: ['#00c07f'],
          dataLabels: { enabled: true, formatter: v => v.toFixed(1) + '%', style: { fontSize: '11px', colors: ['#fff'] } },
          tooltip: { y: { formatter: v => v.toFixed(1) + '% de contribution au gain' } },
          grid: { borderColor: '#f1f5f9' }
        }).render();
      }).catch(e => { console.warn('Importance tarification:', e); impEl._rendered = false; });
  }
}

(async function init() {
  const activePanel = document.querySelector('.section-panel.active');
  const activeName = activePanel ? activePanel.id.replace('panel-', '') : 'overview';
  window.renderChartsForModule(activeName);
})();

})();
