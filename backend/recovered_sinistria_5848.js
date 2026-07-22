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

        // ── QR Code ───────────────────────────────────────────────────
        const qrImg = document.getElementById('sin-qr-img');
        const qrDl  = document.getElementById('sin-qr-dl');
        qrImg.src   = 'data:image/png;base64,' + data.qr_base64;
        qrDl.href   = 'data:image/png;base64,' + data.qr_base64;

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