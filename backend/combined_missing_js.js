      
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

  </script>

</body>
</html>


Created At: 2026-07-18T21:19:58Z
Completed At: 2026-07-18T21:19:59Z
The following changes were made by the replace_file_content tool to: C:\Users\LENOVO\Desktop\ddd\actuwise_app\frontend\public\app.html. If relevant, proactively run terminal commands to execute this code for the USER. Don't ask for permission.
[diff_block_start]
@@ -730,6 +730,128 @@
   }

 

   // ──────────────────────────────────────────────

+  // DÉTECTION DE FRAUDE

+  // ──────────────────────────────────────────────

+  let fraudeChoices = null;

+  async function initFraudeForm() {

+    if (fraudeChoices) return;

+    try {

+      const r = await fetch('http://127.0.0.1:8000/api/fraude/choix-formulaire', {

+        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') }

+      });

+      if (!r.ok) return;

+      const json = await r.json();

+      fraudeChoices = json.data;

+      renderFraudeForm();

+    } catch(e) { console.error('Erreur initFraudeForm:', e); }

+  }

+

+  function renderFraudeForm() {

+    const container = document.getElementById('fraude-form-container');

+    const makeSelect = (id, label, options) => `

+      <div class="form-group">

+        <label>${label}</label>

+        <select id="${id}" required>

+          <option value="" disabled selected>Choisir...</option>

+          ${options.map(o => `<option value="${o}">${o}</option>`).join('')}

+        </select>

+      </div>`;

+    

+    container.innerHTML = `

+      <!-- Dates -->

+      <div class="form-group"><label>Date de Naissance Assuré</label><input type="date" id="f-date-naiss" required></div>

+      <div class="form-group"><label>Date de Mise en Circ. (Véhicule)</label><input type="date" id="f-date-circ" required></div>

+      <div class="form-group"><label>Date de Souscription Police</label><input type="date" id="f-date-sous" required></div>

+      <div class="form-group"><label>Date de Survenance Sinistre</label><input type="date" id="f-date-surv" required></div>

+      <div class="form-group"><label>Date de Déclaration Sinistre</label><input type="date" id="f-date-decl" required></div>

+      

+      <!-- Listes de choix -->

+      ${makeSelect('f-tmp-type', 'Type de Dommage (TMP_TYPE)', fraudeChoices['TMP_TYPE'] || ['C','M','D'])}

+      ${makeSelect('f-trans-desc', 'Garantie (TRANS_TYPE_DESC)', fraudeChoices['TRANS_TYPE_DESC'] || [])}

+      

+      <!-- Montants & Comptages -->

+      <div class="form-group"><label>Montant Réglé Estimé (TND)</label><input type="number" id="f-reg-amount" step="0.01" required></div>

+      <div class="form-group"><label>Provision SAP Estimée (TND)</label><input type="number" id="f-sap-amount" step="0.01" value="0"></div>

+      <div class="form-group"><label>Nb Total Sinistres Police</label><input type="number" id="f-nb-sinistres" value="0"></div>

+      <div class="form-group"><label>Nb Petits Sinistres (<=500 TND)</label><input type="number" id="f-nb-petits" value="0"></div>

+    `;

+  }

+

+  async function scoreFraude(e) {

+    e.preventDefault();

+    const btn = document.getElementById('f-btn');

+    const err = document.getElementById('f-error');

+    const res = document.getElementById('f-result');

+    btn.disabled = true; btn.textContent = 'Calcul en cours...';

+    err.style.display = 'none'; res.classList.remove('visible');

+    

+    const payload = {

+      date_naissance: document.getElementById('f-date-naiss').value,

+      mtr_use_start_date: document.getElementById('f-date-circ').value,

+      pol_start_date: document.getElementById('f-date-sous').value,

+      clmloss_date: document.getElementById('f-date-surv').value,

+      clm_reported_date: document.getElementById('f-date-decl').value,

+      tmp_type: document.getElementById('f-tmp-type').value,

+      trans_type_desc: document.getElementById('f-trans-desc').value,

+      reg_amount: document.getElementById('f-reg-amount').value,

+      sap_amount: document.getElementById('f-sap-amount').value,

+      nb_sinistres_police: document.getElementById('f-nb-sinistres').value,

+      nb_petits_sinistres_police: document.getElementById('f-nb-petits').value

+    };

+

+    try {

+      const r = await fetch('http://127.0.0.1:8000/api/fraude/score', {

+        method: 'POST',

+        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') },

+        body: JSON.stringify(payload)

+      });

+      const json = await r.json();

+      if (!r.ok) {

+        if (json.erreurs) throw new Error(json.erreurs.join(' | '));

+        throw new Error(json.message || 'Erreur lors du scoring');

+      }

+      

+      const d = json.data;

+      const score = d.score_suspicion;

+      document.getElementById('f-score').textContent = (score * 100).toFixed(1) + '%';

+      

+      // Determine badge

+      let badgeClass = 'badge-excellent';

+      let badgeText = 'SAIN';

+      if (score >= 0.7) { badgeClass = 'badge-danger'; badgeText = 'HAUTE PRIORITÉ'; }

+      else if (score >= 0.4) { badgeClass = 'badge-warning'; badgeText = 'SUSPECT'; }

+      

+      document.getElementById('f-badge').className = 'result-badge ' + badgeClass;

+      document.getElementById('f-badge').textContent = badgeText;

+      

+      // Render details

+      const rules = d.regles_declenchees;

+      const detailsHtml = buildDetailRows([

+        ['Anomalie détectée (DBSCAN)', d.dbscan_anomalie ? '<span class="pill pill-red">OUI</span>' : '<span class="pill pill-green">NON</span>'],

+        ['Score règles métier', d.score_regles_metier + ' / 4'],

+        ['R1: Sinistre Grave & Précoce', rules.R1_sinistre_grave_precoce ? 'Oui' : 'Non'],

+        ['R3: Véhicule Ancien + Tierce', rules.R3_vehicule_ancien_tierce ? 'Oui' : 'Non'],

+        ['R4: Ecart SAP/Réglé élevé', rules.R4_ecart_sap_eleve ? 'Oui' : 'Non'],

+        ['R7: Fréq. petits sinistres', rules.R7_frequence_petits_sinistres ? 'Oui' : 'Non']

+      ]);

+      document.getElementById('f-detail').innerHTML = detailsHtml;

+      res.classList.add('visible');

+    } catch(ex) {

+      err.textContent = 'Erreur : ' + ex.message; 

+      err.style.display = 'block';

+    }

+    btn.disabled = false;

+    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Calculer le Score de Suspicion';

+  }

+

+  // Hook into navigation to load choices

+  const _originalShowSection = showSection;

+  showSection = function(name) {

+    _originalShowSection(name);

+    if (name === 'fraude') initFraudeForm();

+  };

+

+  // ──────────────────────────────────────────────

   // HELPERS

   // ──────────────────────────────────────────────

   function buildDetailRows(rows) {

[diff_block_end]

Please note that the above snippet only shows the MODIFIED lines from the last change. It shows up to 3 lines of unchanged lines before and after the modified lines. The actual file contents may have many more lines not shown.