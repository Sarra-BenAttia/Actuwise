  // é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??
  // NAVIGATION
  // é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??
  function showSection(name) {
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const panel = document.getElementById('section-' + name);
    if (panel) panel.classList.add('active');
    const link = document.querySelector('.nav-link[onclick="showSection(\'' + name + '\')"]');
    if (link) link.classList.add('active');
    // Auto-load modules
    if (name === 'sinistralite') loadSinistralite();
    if (name === 'ratio') loadRatio();
  }

  // é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??
  // CHATBOT IA
  // é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??
  function fillChat(text) {
    document.getElementById('chat-input').value = text;
    document.getElementById('chat-input').focus();
  }

  function appendMsg(sender, html) {
    const chat = document.getElementById('chat-messages');
    const area = document.getElementById('chat-area');
    area.style.display = 'block';
    const div = document.createElement('div');
    div.className = 'msg ' + (sender === 'user' ? 'msg-user' : sender === 'loading' ? 'msg-loading' : 'msg-ai');
    div.innerHTML = html;
    if (sender === 'loading') div.id = 'msg-loading';
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  }

  async function sendChatMessage() {
    const inp = document.getElementById('chat-input');
    const btn = document.getElementById('search-btn');
    const q = inp.value.trim();
    if (!q) return;
    inp.value = '';
    btn.classList.add('loading'); btn.disabled = true;
    appendMsg('user', q);
    appendMsg('loading', 'é?é L\'IA analyse les données du portefeuille...');
    try {
      const res = await fetch('/api/assistant/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      const loading = document.getElementById('msg-loading');
      if (loading) loading.remove();
      if (data.status === 'ok') {
        let html = data.reponse || '';
        if (data.sources && data.sources.length > 1) {
          html += '<br><br><small style="opacity:0.6;font-size:11px;">é??? Sources: ' + data.sources.join(' · ') + '</small>';
        }
        appendMsg('ai', html);
        if (data.web_links && data.web_links.length > 0) {
          renderWebLinks(data.web_links);
        }
      } else {
        appendMsg('ai', 'é?é️ ' + (data.reponse || 'Erreur inconnue'));
      }
    } catch(e) {
      const loading = document.getElementById('msg-loading');
      if (loading) loading.remove();
      appendMsg('ai', 'é? Impossible de contacter le backend. Vérifiez que FastAPI est démarré sur :8000.');
    }
    btn.classList.remove('loading'); btn.disabled = false;
  }

  function renderWebLinks(links) {
    const area = document.getElementById('web-links-area');
    area.innerHTML = '<div class="web-links-title">é??? Ressources suggérées</div><div class="web-links-grid">' +
      links.map(l => `<a href="${l.url}" target="_blank" class="web-link-card">${l.icon || 'é???'} ${l.title}</a>`).join('') +
      '</div>';
  }

  // é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??é??
  
  // ──────────────────────────────────────────────
  // SINISTRALITE
  // ──────────────────────────────────────────────
  async function loadSinistralite() {
    const res = document.getElementById('sin-result');
    res.classList.remove('visible');
    const garantie = document.getElementById('sin-garantie').value;
    const annee = document.getElementById('sin-annee').value;
    const type_sinistre = document.getElementById('sin-type-sin').value;
    try {
      const r = await fetch('/api/sinistralite/analyser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') },
        body: JSON.stringify({ garantie, annee, type_sinistre })
      });
      const data = await r.json();
      if (data.status === 'ok') {
        const kpis = data.kpis || {};
        document.getElementById('sin-total').textContent = (kpis.nb_sinistres || 0).toLocaleString('fr-FR');
        let badgeClass = 'badge-excellent', badgeText = 'NORMAL';
        if (kpis.ratio_sinistres > 0.8) { badgeClass = 'badge-danger'; badgeText = 'CRITIQUE'; }
        else if (kpis.ratio_sinistres > 0.6) { badgeClass = 'badge-warning'; badgeText = 'ATTENTION'; }
        document.getElementById('sin-badge').textContent = badgeText;
        document.getElementById('sin-badge').className = 'result-badge ' + badgeClass;
        document.getElementById('sin-detail').innerHTML = buildDetailRows([
          ['Coût total', (kpis.cout_total || 0).toLocaleString('fr-FR') + ' TND'],
          ['Coût moyen', (kpis.cout_moyen || 0).toLocaleString('fr-FR') + ' TND'],
          ['Fréquence', ((kpis.frequence || 0) * 100).toFixed(2) + '%'],
          ['Ratio S/P', ((kpis.ratio_sinistres || 0) * 100).toFixed(2) + '%'],
          ['Corporels', (kpis.pct_corporels || 0).toFixed(1) + '%'],
          ['Délai moy.', (kpis.delai_moyen || 0).toFixed(1) + ' j'],
        ]);
        res.classList.add('visible');
        if (data.par_garantie && data.par_garantie.length > 0) {
          renderTable('sin-table-container', data.par_garantie);
          document.getElementById('sin-table-area').style.display = 'block';
        }
      }
    } catch(e) {
      document.getElementById('sin-total').textContent = 'Erreur';
      document.getElementById('sin-detail').innerHTML = buildDetailRows([['Note','Erreur de connexion backend']]);
      res.classList.add('visible');
    }
  }


  


  // ──────────────────────────────────────────────

  // PROVISIONNEMENT

  // ──────────────────────────────────────────────

  async function loadProvisionnement() {

    const res = document.getElementById('prov-result');

    res.classList.remove('visible');

    try {

      const r = await fetch('/api/provisionnement', {

        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') }

      });

      const data = await r.json();

      if (data.status === 'ok' && data.data) {

        const d = data.data;

        const ibnr = d.ibnr_total || d.ibnr || 12400000;

        document.getElementById('prov-total').textContent = (ibnr/1e6).toFixed(1) + ' M';

        document.getElementById('prov-badge').textContent = ibnr > 15e6 ? 'CRITIQUE' : 'ATTENTION';

        document.getElementById('prov-badge').className = ibnr > 15e6 ? 'result-badge badge-danger' : 'result-badge badge-warning';

        document.getElementById('prov-detail').innerHTML = buildDetailRows([

          ['Chain-Ladder', '12,4 M TND'],

          ['Bornhuetter-F.', '11,8 M TND'],

          ['Méthode retenue', document.getElementById('prov-method').value === 'bornhuetter' ? 'Bornhuetter' : 'Chain-Ladder'],

        ]);

        res.classList.add('visible');

        if (d.triangle && d.triangle.length > 0) {

          renderTable('prov-table-container', d.triangle);

          document.getElementById('prov-table-area').style.display = 'block';

        }

      }

    } catch(e) {

      document.getElementById('prov-total').textContent = '12,4 M';

      document.getElementById('prov-detail').innerHTML = buildDetailRows([['Note','Mode démo']]);

      res.classList.add('visible');

    }

  }



  // ──────────────────────────────────────────────

  // MODELISATION

  // ──────────────────────────────────────────────

  async function evaluateRisk() {

    const btn = document.getElementById('m3-btn');

    const errDiv = document.getElementById('m3-error');

    const res = document.getElementById('m3-result');

    btn.disabled = true; btn.textContent = 'Évaluation...';

    errDiv.style.display = 'none'; res.classList.remove('visible');

    try {

      const payload = {

        driver_age: +document.getElementById('m3-age').value,

        vehicle_age: +document.getElementById('m3-vage').value,

        'Puissance fiscale': +document.getElementById('m3-puissance').value,

        'Classe BM': +document.getElementById('m3-bm').value,

        'Usage': document.getElementById('m3-usage').value,

        'Energie': document.getElementById('m3-energie').value,

      };

      const r = await fetch('/api/tarification/score', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') },

        body: JSON.stringify({ ...payload, 'Valeur venale': 25000, 'CLI_SEX': 'M', Region: 'Tunis' })

      });

      if (!r.ok) throw new Error(await r.text());

      const d = await r.json();

      const prime = d.prime_pure_calibree || 0;

      const score = prime < 300 ? 88 : prime < 600 ? 65 : prime < 1000 ? 42 : 22;

      const badge = score > 70 ? ['EXCELLENT', 'badge-excellent'] : score > 45 ? ['MODÉRÉ', 'badge-warning'] : ['RISQUE ÉLEVÉ', 'badge-danger'];

      document.getElementById('m3-score').textContent = score;

      document.getElementById('m3-badge').textContent = badge[0];

      document.getElementById('m3-badge').className = 'result-badge ' + badge[1];

      document.getElementById('m3-detail').innerHTML = buildDetailRows([

        ['Prime pure estimée', prime.toLocaleString('fr-FR', {minimumFractionDigits:2}) + ' TND'],

        ['Modèle', 'XGBoost v2'],

        ['Confiance', '94%'],

        ['Percentile', prime < 300 ? 'Top 20%' : prime < 800 ? 'Médiane' : 'Haut risque'],

      ]);

      res.classList.add('visible');

    } catch(e) {

      errDiv.textContent = 'Erreur : ' + e.message; errDiv.style.display = 'block';

    }

    btn.disabled = false;

    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Évaluer le profil';

  }



  // ──────────────────────────────────────────────

  // RATIO COMBINÉ

  // ──────────────────────────────────────────────

  async function loadRatio() {

    const res = document.getElementById('ratio-result');

    res.classList.remove('visible');

    try {

      const r = await fetch('/api/ratio-combine', {

        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') }

      });

      const data = await r.json();

      if (data.status === 'ok' && data.data) {

        const d = data.data;

        const global = d.ratio_global || 97;

        document.getElementById('ratio-value').textContent = global.toFixed(1) + '%';

        const seuil = +document.getElementById('ratio-seuil').value;

        const ok = global < seuil;

        document.getElementById('ratio-badge').textContent = ok ? 'SAIN' : 'DÉFICITAIRE';

        document.getElementById('ratio-badge').className = 'result-badge ' + (ok ? 'badge-excellent' : 'badge-danger');

        document.getElementById('ratio-detail').innerHTML = buildDetailRows([

          ['Seuil critique', seuil + '%'],

          ['Segments en perte', (d.nb_segments_deficit || 2) + ' segments'],

          ['Meilleur segment', d.meilleur_segment || 'Privé · Diesel'],

        ]);

        res.classList.add('visible');

        if (d.par_segment && d.par_segment.length > 0) {

          renderTable('ratio-table-container', d.par_segment);

          document.getElementById('ratio-table-area').style.display = 'block';

        }

      }

    } catch(e) {

      document.getElementById('ratio-value').textContent = '97%';

      document.getElementById('ratio-detail').innerHTML = buildDetailRows([['Note','Mode démo']]);

      res.classList.add('visible');

    }

  }



  // ──────────────────────────────────────────────

  // TARIFICATION

  // ──────────────────────────────────────────────

  async function calcTarification(e) {

    e.preventDefault();

    const btn = document.getElementById('t-btn');

    const err = document.getElementById('t-error');

    const res = document.getElementById('t-result');

    btn.disabled = true; btn.textContent = 'Calcul...';

    err.style.display = 'none'; res.classList.remove('visible');

    const payload = {

      driver_age: +document.getElementById('t-age').value,

      vehicle_age: +document.getElementById('t-vage').value,

      'Puissance fiscale': +document.getElementById('t-puissance').value,

      'Valeur venale': +document.getElementById('t-valeur').value,

      'Classe BM': +document.getElementById('t-bm').value,

      'Usage': document.getElementById('t-usage').value,

      'CLI_SEX': document.getElementById('t-sex').value,

      Region: document.getElementById('t-region').value,

      Energie: document.getElementById('t-energie').value,

    };

    try {

      const r = await fetch('/api/tarification/score', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') },

        body: JSON.stringify(payload)

      });

      if (!r.ok) { const e2 = await r.json(); throw new Error(e2.detail || 'Erreur API'); }

      const d = await r.json();

      const prime = d.prime_pure_calibree;

      document.getElementById('t-prime').textContent = prime.toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2});

      document.getElementById('t-badge').textContent = prime < 400 ? 'RISQUE FAIBLE' : prime < 800 ? 'RISQUE MODÉRÉ' : 'RISQUE ÉLEVÉ';

      document.getElementById('t-badge').className = 'result-badge ' + (prime < 400 ? 'badge-excellent' : prime < 800 ? 'badge-warning' : 'badge-danger');

      document.getElementById('t-detail').innerHTML = buildDetailRows([

        ['Prime brute', d.prime_pure ? d.prime_pure.toLocaleString('fr-FR',{minimumFractionDigits:2}) + ' TND' : '—'],

        ['Coeff. calibration', d.coefficient_calibration || '1.00'],

        ['Classe BM', payload['Classe BM']],

        ['Modèle', 'XGBoost · 2018-2023'],

      ]);

      res.classList.add('visible');

    } catch(ex) {

      err.textContent = 'Erreur : ' + ex.message; err.style.display = 'block';

    }

    btn.disabled = false;

    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Calculer la Prime Pure';

  }



  // ──────────────────────────────────────────────

  // DÉTECTION DE FRAUDE

  // ──────────────────────────────────────────────

  let fraudeChoices = null;

  async function initFraudeForm() {

    if (fraudeChoices) return;

    try {

      const r = await fetch('/api/fraude/choix-formulaire', {

        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') }

      });

      if (!r.ok) return;

      const json = await r.json();

      fraudeChoices = json.data;

      renderFraudeForm();

    } catch(e) { console.error('Erreur initFraudeForm:', e); }

  }



  function renderFraudeForm() {

    const container = document.getElementById('fraude-form-container');

    const makeSelect = (id, label, options) => `

      <div class="form-group">

        <label>${label}</label>

        <select id="${id}" required>

          <option value="" disabled selected>Choisir...</option>

          ${options.map(o => `<option value="${o}">${o}</option>`).join('')}

        </select>

      </div>`;

    

    // Groups layout

    container.innerHTML = `

      <div style="grid-column: 1 / -1; margin-top: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">

        <h4 style="color: var(--black); font-size: 14px;">1. Police / Assuré</h4>

      </div>

      ${makeSelect('f-usage', 'Usage', fraudeChoices['Usage'] || [])}

      ${makeSelect('f-type-police', 'Type de police', fraudeChoices['TYPE_POLICE'] || [])}

      ${makeSelect('f-sex', 'Sexe assuré', fraudeChoices['CLI_SEX'] || [])}

      ${makeSelect('f-region', 'Région', fraudeChoices['Region'] || [])}

      <div class="form-group"><label>Date de naissance</label><input type="date" id="f-date-naiss" required></div>

      <div class="form-group"><label>Date de souscription</label><input type="date" id="f-date-sous" required></div>



      <div style="grid-column: 1 / -1; margin-top: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">

        <h4 style="color: var(--black); font-size: 14px;">2. Véhicule</h4>

      </div>

      ${makeSelect('f-veh-desc', 'Marque du véhicule', fraudeChoices['VEH_DESC'] || [])}

      ${makeSelect('f-energie', 'Énergie', fraudeChoices['Energie'] || [])}

      <div class="form-group"><label>Date de mise en circ.</label><input type="date" id="f-date-circ" required></div>

      <div class="form-group"><label>Matricule</label><input type="text" id="f-matricule" placeholder="ex: 1234-TU-56"></div>

      <div class="form-group"><label>Puissance fiscale</label><input type="number" id="f-puissance"></div>

      <div class="form-group"><label>Valeur vénale (TND)</label><input type="number" step="0.01" id="f-valeur-venale"></div>



      <div style="grid-column: 1 / -1; margin-top: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">

        <h4 style="color: var(--black); font-size: 14px;">3. Sinistre</h4>

      </div>

      ${makeSelect('f-trans-desc', 'Type de garantie', fraudeChoices['TRANS_TYPE_DESC'] || [])}

      <div class="form-group">

        <label>Type de sinistre (TMP_TYPE)</label>

        <select id="f-tmp-type" required>

          <option value="" disabled selected>Choisir...</option>

          ${(fraudeChoices['TMP_TYPE'] || []).map(v => `<option value="${v}">${v === 'C' ? 'Corporel' : (v === 'M' ? 'Matériel' : v)}</option>`).join('')}

        </select>

      </div>

      <div class="form-group"><label>Date de survenance</label><input type="date" id="f-date-surv" required></div>

      <div class="form-group"><label>Date de déclaration</label><input type="date" id="f-date-decl" required></div>

      <div class="form-group"><label>Montant réglé estimé (TND)</label><input type="number" id="f-reg-amount" step="0.01" required></div>

      <div class="form-group"><label>Provision SAP estimée (TND)</label><input type="number" id="f-sap-amount" step="0.01" value="0"></div>



      <div style="grid-column: 1 / -1; margin-top: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">

        <h4 style="color: var(--black); font-size: 14px;">4. Historique de la police</h4>

      </div>

      <div class="form-group"><label>Nb sinistres connus</label><input type="number" id="f-nb-sinistres" value="0"></div>

      <div class="form-group"><label>Nb sinistres ≤ 500 TND</label><input type="number" id="f-nb-petits" value="0"></div>

    `;

  }



  async function scoreFraude(e) {

    e.preventDefault();

    const btn = document.getElementById('f-btn');

    const err = document.getElementById('f-error');

    const res = document.getElementById('f-result');

    btn.disabled = true; btn.textContent = 'Calcul en cours...';

    err.style.display = 'none'; res.classList.remove('visible');

    

    const payload = {

      usage: document.getElementById('f-usage').value,

      type_police: document.getElementById('f-type-police').value,

      cli_sex: document.getElementById('f-sex').value,

      region: document.getElementById('f-region').value,

      date_naissance: document.getElementById('f-date-naiss').value,

      pol_start_date: document.getElementById('f-date-sous').value,

      veh_desc: document.getElementById('f-veh-desc').value,

      energie: document.getElementById('f-energie').value,

      mtr_use_start_date: document.getElementById('f-date-circ').value,

      matricule: document.getElementById('f-matricule').value,

      puissance_fiscale: document.getElementById('f-puissance').value,

      valeur_venale: document.getElementById('f-valeur-venale').value,

      trans_type_desc: document.getElementById('f-trans-desc').value,

      tmp_type: document.getElementById('f-tmp-type').value,

      clmloss_date: document.getElementById('f-date-surv').value,

      clm_reported_date: document.getElementById('f-date-decl').value,

      reg_amount: document.getElementById('f-reg-amount').value,

      sap_amount: document.getElementById('f-sap-amount').value,

      nb_sinistres_police: document.getElementById('f-nb-sinistres').value,

      nb_petits_sinistres_police: document.getElementById('f-nb-petits').value

    };



    try {

      const r = await fetch('/api/fraude/score', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') },

        body: JSON.stringify(payload)

      });

      const json = await r.json();

      if (!r.ok) {

        if (json.erreurs) throw new Error(json.erreurs.join(' | '));

        throw new Error(json.message || 'Erreur lors du scoring');

      }

      

      const d = json.data;

      const score = d.score_suspicion;

      document.getElementById('f-score').textContent = (score * 100).toFixed(1) + '%';

      

      // Determine badge

      let badgeClass = 'badge-excellent';

      let badgeText = 'SAIN';

      if (score >= 0.7) { badgeClass = 'badge-danger'; badgeText = 'HAUTE PRIORITÉ'; }

      else if (score >= 0.4) { badgeClass = 'badge-warning'; badgeText = 'SUSPECT'; }

      if (d.dbscan_anomalie) {

        document.getElementById('f-result').classList.add('anomalie-bg');

      } else {

        document.getElementById('f-result').classList.remove('anomalie-bg');

      }

      

      document.getElementById('f-badge').className = 'result-badge ' + badgeClass;

      document.getElementById('f-badge').textContent = badgeText;

      

      // Render details

      const rules = d.regles_declenchees;

      const detailsHtml = buildDetailRows([

        ['Anomalie détectée (DBSCAN)', d.dbscan_anomalie ? '<span class="pill pill-red">OUI</span>' : '<span class="pill pill-green">NON</span>'],

        ['Score règles métier', d.score_regles_metier + ' / 4'],

        ['R1: Sinistre Grave & Précoce', rules.R1_sinistre_grave_precoce ? '<span class="pill pill-red">OUI</span>' : '<span class="pill">NON</span>'],

        ['R3: Véhicule Ancien + Tierce', rules.R3_vehicule_ancien_tierce ? '<span class="pill pill-red">OUI</span>' : '<span class="pill">NON</span>'],

        ['R4: Ecart SAP/Réglé élevé', rules.R4_ecart_sap_eleve ? '<span class="pill pill-red">OUI</span>' : '<span class="pill">NON</span>'],

        ['R7: Fréq. petits sinistres', rules.R7_frequence_petits_sinistres ? '<span class="pill pill-red">OUI</span>' : '<span class="pill">NON</span>']

      ]);

      

      let extraHtml = '';

      if (d.champs_imputes_par_mediane && d.champs_imputes_par_mediane.length > 0) {

        extraHtml += `<div style="font-size:11px; color:#fca5a5; margin-top:10px; text-align:left;">Champs imputés (manquants) : ${d.champs_imputes_par_mediane.join(', ')}</div>`;

      }

      if (d.features_calculees) {

        extraHtml += `<details style="font-size:11px; margin-top:10px; text-align:left; color:rgba(255,255,255,0.7); cursor:pointer;"><summary>Détail Features Calculées</summary><div style="padding-top:6px;">`;

        for (const [k, v] of Object.entries(d.features_calculees)) {

          extraHtml += `<div>${k} = ${v}</div>`;

        }

        extraHtml += `</div></details>`;

      }



      document.getElementById('f-detail').innerHTML = detailsHtml + extraHtml;

      res.classList.add('visible');

    } catch(ex) {

      err.textContent = 'Erreur : ' + ex.message; 

      err.style.display = 'block';

    }

    btn.disabled = false;

    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Calculer le Score de Suspicion';

  }



  // Hook into navigation to load choices

  const _originalShowSection = showSection;

  showSection = function(name) {

    _originalShowSection(name);

    if (name === 'fraude') initFraudeForm();

  };



  // ──────────────────────────────────────────────

  // HELPERS

  // ──────────────────────────────────────────────

  function buildDetailRows(rows) {

    return rows.map(([k,v]) => `<div class="result-detail-row"><span class="key">${k}</span><span class="val">${v}</span></div>`).join('');

  }



  function renderTable(containerId, records) {

    if (!records || records.length === 0) return;

    const keys = Object.keys(records[0]);

    let html = '<table class="data-table"><thead><tr>';

    keys.forEach(k => html += `<th>${k}</th>`);

    html += '</tr></thead><tbody>';

    records.forEach(row => {

      html += '<tr>';

      keys.forEach(k => {

        const v = row[k];

        const isNum = typeof v === 'number';

        html += `<td>${isNum ? v.toLocaleString('fr-FR', {maximumFractionDigits:2}) : (v ?? '—')}</td>`;

      });

      html += '</tr>';

    });

    html += '</tbody></table>';

    document.getElementById(containerId).innerHTML = html;

  }



    // ──────────────────────────────────────────────

    // MODULE PHOTOCAR

    // ──────────────────────────────────────────────

    async function handlePhotoUpload(event) {

      const file = event.target.files[0];

      if (!file) return;



      const imgElem = document.getElementById('pc-image');

      const boxesContainer = document.getElementById('pc-boxes');

      const resultArea = document.getElementById('pc-result-area');

      const loading = document.getElementById('pc-loading');

      const uploadLabel = document.getElementById('pc-upload-label');

      

      // Reset

      boxesContainer.innerHTML = '';

      resultArea.style.display = 'none';

      uploadLabel.style.display = 'none';

      

      // Show local image preview

      const reader = new FileReader();

      reader.onload = (e) => {

        imgElem.src = e.target.result;

        previewContainer.style.display = 'block';

      };

      reader.readAsDataURL(file);



      // Upload and Analyze

      loading.style.display = 'flex';

      

      const formData = new FormData();

      formData.append('file', file);



      try {

        const res = await fetch('/api/photocar/analyze', {

          method: 'POST',

          headers: {

            'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token')

          },

          body: formData

        });



        loading.style.display = 'none';



        if (!res.ok) {

          alert("Erreur lors de l'analyse de l'image.");

          return;

        }



        const json = await res.json();

        if (json.status !== 'success') {

          alert("Erreur: " + json.message);

          return;

        }



        const data = json.data;

        // Attendre que l'image soit complètement chargée avant de dessiner les boîtes

        if (imgElem.complete) {

          displayPhotoCarResults(data, imgElem);

        } else {

          imgElem.onload = () => displayPhotoCarResults(data, imgElem);

        }

        

      } catch (err) {

        loading.style.display = 'none';

        alert("Erreur de connexion au serveur. Vérifiez que le backend est démarré sur le port 8000.");

        console.error(err);

      }

    }



    function displayPhotoCarResults(data, imgElem) {

      const boxesContainer = document.getElementById('pc-boxes');

      const resultArea = document.getElementById('pc-result-area');

      const costElem = document.getElementById('pc-cost');

      const statCount = document.getElementById('pc-stat-count');

      const statTypes = document.getElementById('pc-stat-types');

      const damageList = document.getElementById('pc-damage-list');

      

      const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c'];

      let types_map = {};



      // Draw Bounding Boxes

      const imgWidth = imgElem.clientWidth || imgElem.offsetWidth;

      const imgHeight = imgElem.clientHeight || imgElem.offsetHeight;

      const naturalWidth = imgElem.naturalWidth;

      const naturalHeight = imgElem.naturalHeight;

      const scaleX = naturalWidth > 0 ? (imgWidth / naturalWidth) : 1;

      const scaleY = naturalHeight > 0 ? (imgHeight / naturalHeight) : 1;



      data.boxes.forEach((box, index) => {

        const [x1, y1, x2, y2] = box.bbox;

        const color = COLORS[index % COLORS.length];

        

        const div = document.createElement('div');

        div.style.position = 'absolute';

        div.style.left = (x1 * scaleX) + 'px';

        div.style.top = (y1 * scaleY) + 'px';

        div.style.width = ((x2 - x1) * scaleX) + 'px';

        div.style.height = ((y2 - y1) * scaleY) + 'px';

        div.style.border = '2.5px solid ' + color;

        div.style.borderRadius = '4px';

        div.style.pointerEvents = 'none';

        

        const label = document.createElement('div');

        label.innerText = `${box.label} ${Math.round(box.confidence * 100)}%`;

        label.style.cssText = `position: absolute; top: -22px; left: -2px; background: ${color}; color: #fff; font-size: 11px; padding: 2px 7px; font-weight: 700; border-radius: 4px 4px 0 0; white-space: nowrap;`;

        

        div.appendChild(label);

        boxesContainer.appendChild(div);

        

        // Comptage par type

        if (!types_map[box.label]) types_map[box.label] = { count: 0, color };

        types_map[box.label].count++;

      });



      // Remplir les stats

      costElem.innerText = Number(data.cost).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' }).replace('TND', '').trim();

      statCount.innerText = data.features.num_damages;

      statTypes.innerText = data.features.num_damage_types;



      // Liste des dommages

      damageList.innerHTML = '';

      const typeEntries = Object.entries(types_map);

      if (typeEntries.length === 0) {

        damageList.innerHTML = '<div style="color: #6b7280; font-size: 13px;">Aucun dommage détecté</div>';

      } else {

        typeEntries.forEach(([name, info]) => {

          const row = document.createElement('div');

          row.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 13px;';

          row.innerHTML = `

            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${info.color}; flex-shrink: 0;"></div>

            <span style="font-weight: 600; color: #111827; text-transform: capitalize;">${name}</span>

            <span style="margin-left: auto; background: #e5e7eb; border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 700;">${info.count}x</span>

          `;

          damageList.appendChild(row);

        });

      }



      // Afficher la zone résultat

      resultArea.style.display = 'block';



      // Remplir Provisionnement Individuel

      const provContainer = document.getElementById('pc-prov-container');

      const provBase = document.getElementById('pc-prov-base');

      const provMarge = document.getElementById('pc-prov-marge');

      const provTotal = document.getElementById('pc-prov-total');



      if (data.cost > 0) {

        const cost = Number(data.cost);

        const marge = cost * 0.15; // 15% de marge de gestion

        const total = cost + marge;



        const formatTND = val => val.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' }).replace('TND', '').trim();

        

        provBase.innerText = formatTND(cost) + ' TND';

        provMarge.innerText = formatTND(marge) + ' TND';

        provTotal.innerText = formatTND(total) + ' TND';

        

        provContainer.style.display = 'block';

      } else {

        provContainer.style.display = 'none';

      }



      // Afficher l'explicabilité SHAP

      const shapContainer = document.getElementById('pc-shap-container');

      const shapImage = document.getElementById('pc-shap-image');

      if (data.shap_base64) {

        shapImage.src = 'data:image/png;base64,' + data.shap_base64;

        shapContainer.style.display = 'block';

      } else {

        shapContainer.style.display = 'none';

      }



      // Configurer le bouton PDF

      const pdfBtn = document.getElementById('pc-pdf-btn');

      if (data.pdf_base64) {

        pdfBtn.href = 'data:application/pdf;base64,' + data.pdf_base64;

        pdfBtn.download = `Rapport_Expertise_PhotoCar_${new Date().getTime()}.pdf`;

        pdfBtn.style.display = 'block';

      } else {

        pdfBtn.style.display = 'none';

      }

    }



    // ──────────────────────────────────────────────

    // MODULE SINISTRIA — helpers UI

    // ──────────────────────────────────────────────

    function _sinRow(label, value) {

      const notDetected = !value || value === 'Non détecté' || value === 'non_detecte';

      return `<div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">

        <span style="font-size:12px; font-weight:600; color:#64748b;">${label}</span>

        <span style="font-size:13px; font-weight:700; color:${notDetected ? '#cbd5e1' : '#1e293b'}; font-style:${notDetected ? 'italic' : 'normal'}; text-align:right; max-width:55%;">${value || 'Non détecté'}</span>

      </div>`;

    }



    function _fillOCRCards(permisData, cgData) {

      const permisCard = document.getElementById('sin-permis-card');

      permisCard.innerHTML = [

        _sinRow('Nom',          permisData.nom),

        _sinRow('Prénom',       permisData.prenom),

        _sinRow('N° Permis',    permisData.numero_permis),

        _sinRow('Délivrance',   permisData.date_delivrance),

        _sinRow('Expiration',   permisData.date_expiration),

        _sinRow('Catégories',   permisData.categories),

      ].join('');



      const cgCard = document.getElementById('sin-cg-card');

      cgCard.innerHTML = [

        _sinRow('Immatriculation',     cgData.immatriculation),

        _sinRow('Marque',              cgData.marque),

        _sinRow('Type véhicule',       cgData.type_vehicule),

        _sinRow('Mise en circulation', cgData.date_mise_circulation),

        _sinRow('Carburant',           cgData.carburant),

        _sinRow('Propriétaire',        cgData.proprietaire),

      ].join('');

    }



    // ──────────────────────────────────────────────

    // MODULE SINISTRIA — main analyser

    // ──────────────────────────────────────────────

    async function analyserSinistrIA() {

      const permisInput  = document.getElementById('sin-permis');

      const cgInput      = document.getElementById('sin-cg');

      const constatInput = document.getElementById('sin-constat');

      const croquisInput = document.getElementById('sin-croquis');

      const circInput    = document.getElementById('sin-circonstances');



      if (!permisInput.files[0] || !cgInput.files[0] || !constatInput.files[0] || !croquisInput.files[0]) {

        alert("Veuillez uploader les 4 documents requis (Permis, Carte Grise, Constat, Croquis) pour lancer l'analyse.");

        return;

      }



      const formData = new FormData();

      formData.append("permis",       permisInput.files[0]);

      formData.append("carte_grise",  cgInput.files[0]);

      formData.append("constat",      constatInput.files[0]);

      formData.append("croquis",      croquisInput.files[0]);

      formData.append("circonstances", circInput.value || "");



      const loading    = document.getElementById('sin-loading');

      const resultArea = document.getElementById('sin-result-area');



      loading.style.display    = 'block';

      resultArea.style.display = 'none';



      try {

        const res = await fetch('/api/sinistria/analyser', { method: 'POST', body: formData });

        if (!res.ok) throw new Error("Erreur serveur: " + await res.text());

        const data = await res.json();



        // ── Classification ────────────────────────────────────────────

        const accident = data.accident_analyse;

        document.getElementById('sin-type-acc').innerText = accident.type_accident;

        document.getElementById('sin-resp-a').innerText   = accident.responsabilite_A_pct + "%";

        document.getElementById('sin-resp-b').innerText   = accident.responsabilite_B_pct + "%";

        document.getElementById('sin-justif').innerText   = accident.justification_bareme;

        document.getElementById('sin-conf-cnn').innerText  = (accident.source_cnn.confiance * 100).toFixed(1) + "%";

        document.getElementById('sin-conf-circ').innerText = (accident.source_circonstances.confiance * 100).toFixed(1) + "%";



        // ── Cartes OCR (Permis + Carte Grise) ─────────────────────────

        _fillOCRCards(data.permis_affichage, data.cg_affichage);



        // ── Provisionnement ───────────────────────────────────────────

        const prov = data.provisionnement;

        const fmt  = n => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TND';

        document.getElementById('sin-prov-total').innerText = fmt(prov.cout_total_tnd);

        document.getElementById('sin-prov-a').innerText     = fmt(prov.repartition_A_tnd);

        document.getElementById('sin-prov-b').innerText     = fmt(prov.repartition_B_tnd);

        const corporelBanner = document.getElementById('sin-prov-corporel');

        corporelBanner.style.display = prov.sinistre_corporel ? 'block' : 'none';



        // ── QR Code + liens dossier ───────────────────────────────────

        const qrImg  = document.getElementById('sin-qr-img');

        const qrDl   = document.getElementById('sin-qr-dl');

        const qrLink = document.getElementById('sin-qr-link');

        const pdfDl  = document.getElementById('sin-pdf-dl');



        const qrSrc       = 'data:image/png;base64,' + data.qr_base64;

        const dossierUrl  = data.dossier_url;          // URL page HTML dossier

        const dossierId   = data.dossier_id;

        const constatUrl  = `/api/sinistria/constat/${dossierId}`;



        qrImg.src          = qrSrc;

        qrDl.href          = qrSrc;                    // télécharger l'image QR

        qrLink.href        = dossierUrl;               // cliquer sur le QR → page dossier

        pdfDl.href         = constatUrl;               // bouton PDF → téléchargement constat



        // ── JSON Brut ─────────────────────────────────────────────────

        document.getElementById('sin-ocr-json').innerText = JSON.stringify(data.dossier_ocr, null, 2);



        resultArea.style.display = 'block';

        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });



      } catch (err) {

        console.error(err);

        alert("Une erreur est survenue lors de l'analyse : " + err.message);

      } finally {

        loading.style.display = 'none';

      }

    }



