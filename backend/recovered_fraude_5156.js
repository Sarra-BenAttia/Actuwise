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
      const r = await fetch('http://127.0.0.1:8000/api/fraude/score', {
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