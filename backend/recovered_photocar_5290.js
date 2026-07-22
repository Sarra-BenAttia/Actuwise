    // ──────────────────────────────────────────────
    // MODULE PHOTOCAR
    // ──────────────────────────────────────────────
    async function handlePhotoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const previewContainer = document.getElementById('pc-preview-container');
      const imgElem = document.getElementById('pc-image');
      const boxesContainer = document.getElementById('pc-boxes');
      const resultPanel = document.getElementById('pc-result');
      const loading = document.getElementById('pc-loading');
      
      // Reset
      boxesContainer.innerHTML = '';
      resultPanel.style.display = 'none';
      
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
        displayPhotoCarResults(data, imgElem);
        
      } catch (err) {
        loading.style.display = 'none';
        alert("Erreur de connexion.");
      }
    }

    function displayPhotoCarResults(data, imgElem) {
      const resultPanel = document.getElementById('pc-result');
      const costElem = document.getElementById('pc-cost');
      const detailElem = document.getElementById('pc-detail');
      const boxesContainer = document.getElementById('pc-boxes');
      
      // Draw Bounding Boxes
      const imgWidth = imgElem.clientWidth;
      const imgHeight = imgElem.clientHeight;
      const naturalWidth = imgElem.naturalWidth;
      const naturalHeight = imgElem.naturalHeight;
      
      const scaleX = imgWidth / naturalWidth;
      const scaleY = imgHeight / naturalHeight;

      // Colors for classes
      const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c'];
      
      let types_set = new Set();
      
      data.boxes.forEach((box, index) => {
        const [x1, y1, x2, y2] = box.bbox;
        const color = COLORS[index % COLORS.length];
        
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = (x1 * scaleX) + 'px';
        div.style.top = (y1 * scaleY) + 'px';
        div.style.width = ((x2 - x1) * scaleX) + 'px';
        div.style.height = ((y2 - y1) * scaleY) + 'px';
        div.style.border = '2px solid ' + color;
        div.style.pointerEvents = 'none';
        
        const label = document.createElement('div');
        label.innerText = `${box.label} ${Math.round(box.confidence * 100)}%`;
        label.style.position = 'absolute';
        label.style.top = '-20px';
        label.style.left = '-2px';
        label.style.background = color;
        label.style.color = '#fff';
        label.style.fontSize = '12px';
        label.style.padding = '2px 6px';
        label.style.fontWeight = 'bold';
        label.style.borderRadius = '4px 4px 0 0';
        
        div.appendChild(label);
        boxesContainer.appendChild(div);
        
        types_set.add(box.label);
      });

      // Show Results
      costElem.innerText = formatDT(data.cost);
      
      let detailsHTML = `
        <div style="background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Dommages détectés</span>
            <span style="font-weight: 600;">${data.features.num_damages}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Types distincts</span>
            <span style="font-weight: 600;">${data.features.num_damage_types}</span>
          </div>
          <div style="margin-top: 15px; font-weight: 600; font-size: 13px; color: var(--black);">Zones touchées :</div>
          <ul style="margin-top: 5px; padding-left: 20px; font-size: 13px; color: #4b5563;">
      `;
      types_set.forEach(t => {
        detailsHTML += `<li>${t}</li>`;
      });
      if (types_set.size === 0) {
        detailsHTML += `<li>Aucun dommage détecté</li>`;
      }
      detailsHTML += `</ul></div>`;
      
      detailElem.innerHTML = detailsHTML;
      resultPanel.style.display = 'block';
    }

  </script>
</body>
</html>