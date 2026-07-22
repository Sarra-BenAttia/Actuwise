// app-dynamic.js - Logic specifically for the Studio App (Minimalist, no dense charts)

// --- Navigation ---
window.showSection = function(name) {
  try {
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(i => i.classList.remove('active'));
    
    const panel = document.getElementById('section-' + name);
    if (panel) panel.classList.add('active');
    
    const link = document.querySelector('.nav-link[onclick="showSection(\'' + name + '\')"]');
    if (link) link.classList.add('active');
    
  } catch (e) { console.error('showSection ERR: ' + e.message); }
};

// --- IA Assistant ---
window.fillChat = function(text) {
  document.getElementById('chat-input').value = text;
  document.getElementById('chat-input').focus();
};

window.appendMessage = function(sender, text) {
  const chat = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.style.marginBottom = '16px';
  msgDiv.style.maxWidth = '85%';
  msgDiv.style.padding = '16px 20px';
  msgDiv.style.borderRadius = '16px';
  msgDiv.style.fontSize = '15px';
  msgDiv.style.lineHeight = '1.6';
  msgDiv.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
  msgDiv.style.fontFamily = "'Inter', sans-serif";

  let parsedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  if (sender === 'user') {
    msgDiv.style.alignSelf = 'flex-end';
    msgDiv.style.background = 'var(--primary-dark)';
    msgDiv.style.color = 'white';
    msgDiv.style.borderBottomRightRadius = '0';
    msgDiv.innerHTML = parsedText;
  } else {
    msgDiv.style.alignSelf = 'flex-start';
    msgDiv.style.background = 'rgba(255, 255, 255, 0.9)';
    msgDiv.style.backdropFilter = 'blur(10px)';
    msgDiv.style.color = 'var(--text-main)';
    msgDiv.style.borderBottomLeftRadius = '0';
    msgDiv.style.border = '1px solid var(--border-color)';
    msgDiv.innerHTML = parsedText;
  }

  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
  chat.style.display = 'flex';
  chat.style.flexDirection = 'column';
};

window.sendChatMessage = async function() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  appendMessage('user', msg);
  input.value = '';

  const chat = document.getElementById('chat-messages');
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'chat-loading';
  loadingDiv.style = 'align-self:flex-start; font-size:13px; color:var(--text-muted); padding:8px 20px; font-style:italic;';
  loadingDiv.textContent = 'L\'IA analyse les données...';
  chat.appendChild(loadingDiv);
  chat.scrollTop = chat.scrollHeight;

  try {
    const response = await fetch('/api/assistant/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token') },
      body: JSON.stringify({ question: msg })
    });
    const data = await response.json();
    document.getElementById('chat-loading').remove();
    if (data.status === 'ok') {
      let html = data.reponse || '';
      if (data.sources && data.sources.length > 0) {
        html += '<br><br><small style="color:var(--text-muted); font-size:11px; font-weight:600;">📚 Sources : ' + data.sources.join(' · ') + '</small>';
      }
      appendMessage('ia', html);
    } else {
      appendMessage('ia', '⚠️ ' + (data.reponse || data.message || 'Erreur inconnue'));
    }
  } catch(err) {
    if(document.getElementById('chat-loading')) document.getElementById('chat-loading').remove();
    appendMessage('ia', 'Erreur de connexion avec l\'IA.');
  }
};

// --- Tarification (Bonus Malus) ---
window.handleTarificationSubmit = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('tarif_btn');
  const amtSpan = document.getElementById('tarif_amount');
  const resultCard = document.getElementById('tarif_result_card');
  
  btn.disabled = true;
  btn.textContent = 'Calcul en cours...';

  const payload = {
    "driver_age": parseInt(document.getElementById('tarif_driver_age').value, 10),
    "vehicle_age": parseInt(document.getElementById('tarif_vehicle_age').value, 10),
    "Puissance fiscale": parseInt(document.getElementById('tarif_puissance').value, 10),
    "Valeur venale": parseFloat(document.getElementById('tarif_valeur').value),
    "Classe BM": parseInt(document.getElementById('tarif_bm').value, 10),
    "Usage": document.getElementById('tarif_usage').value,
    "CLI_SEX": document.getElementById('tarif_sex').value,
    "Region": document.getElementById('tarif_region').value,
    "Energie": document.getElementById('tarif_energie').value
  };

  try {
    const res = await fetch('/api/tarification/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('actuwise_token')
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Erreur API');

    const data = await res.json();
    amtSpan.textContent = data.prime_pure_calibree.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND';
    resultCard.style.display = 'flex';
  } catch (err) {
    alert("Erreur lors de la tarification");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Calculer la Prime';
  }
};

// --- Modélisation (Score de Risque) ---
window.evaluateRisk = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('risk_btn');
  const scoreSpan = document.getElementById('risk_score');
  const badgeDiv = document.getElementById('risk_badge');
  const resultContainer = document.getElementById('risk_result_container');
  
  btn.disabled = true;
  btn.textContent = 'Évaluation...';

  const payload = {
    "feature_1": parseFloat(document.getElementById('risk_f1').value || 0),
    "feature_2": parseFloat(document.getElementById('risk_f2').value || 0)
  };

  try {
    setTimeout(() => {
      const isGood = Math.random() > 0.4;
      if(isGood) {
        badgeDiv.textContent = 'EXCELLENT';
        badgeDiv.className = 'score-badge excellent';
        scoreSpan.textContent = '85/100';
      } else {
        badgeDiv.textContent = 'RISQUE ÉLEVÉ';
        badgeDiv.className = 'score-badge high-risk';
        scoreSpan.textContent = '32/100';
      }
      resultContainer.style.display = 'block';
      
      btn.disabled = false;
      btn.textContent = 'Évaluer le profil';
    }, 800);
    
  } catch (err) {
    alert("Erreur");
    btn.disabled = false;
  }
};
