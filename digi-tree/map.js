// =====================================================================
// CARBON PESA — Map Interface Logic
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {

  // ───────────────────────────────────────────────────────────────────
  // 1. TILE LAYERS & CONFIG
  // ───────────────────────────────────────────────────────────────────
  const mapboxUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'; // Esri Satellite (free, no token)
  const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // OSM Street
  const terrainUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}'; // Esri Terrain
  const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'; // Carto Dark

  const layersConfig = {
    satellite: L.tileLayer(mapboxUrl, { maxZoom: 19, attribution: 'Tiles &copy; Esri' }),
    street: L.tileLayer(streetUrl, { maxZoom: 19, attribution: '&copy; OpenStreetMap' }),
    terrain: L.tileLayer(terrainUrl, { maxZoom: 13, attribution: 'Tiles &copy; Esri' }),
    dark: L.tileLayer(darkUrl, { maxZoom: 20, attribution: '&copy; CARTO' })
  };

  // ───────────────────────────────────────────────────────────────────
  // 2. MAP INSTANCES (Audit & Field)
  // ───────────────────────────────────────────────────────────────────

  // Default coordinates (Mau Forest, Kenya)
  const defaultCenter = [-0.5023, 35.4156];
  const defaultZoom = 15;

  // --- Audit Map (View 1) ---
  const auditMap = L.map('audit-map', {
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: false,
    layers: [layersConfig.satellite] // default layer
  });
  L.control.zoom({ position: 'topright' }).addTo(auditMap);

  // Sub maps (Read-only previews)
  const subMap1 = L.map('sub-map-1', { center: defaultCenter, zoom: defaultZoom - 2, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false });
  L.tileLayer(mapboxUrl, { maxZoom: 19 }).addTo(subMap1);
  
  const subMap2 = L.map('sub-map-2', { center: defaultCenter, zoom: defaultZoom - 2, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false });
  L.tileLayer(terrainUrl, { maxZoom: 13 }).addTo(subMap2);

  // Sync sub-maps with main audit map
  auditMap.on('moveend', () => {
    const center = auditMap.getCenter();
    subMap1.setView(center, auditMap.getZoom() - 2);
    subMap2.setView(center, auditMap.getZoom() - 2);
  });

  // Zoom pulse ring logic (show when zoom >= 16)
  const zoomPulse = document.getElementById('zoomPulseWrap');
  auditMap.on('zoomend', () => {
    if (auditMap.getZoom() >= 16) {
      zoomPulse.style.display = 'block';
    } else {
      zoomPulse.style.display = 'none';
    }
  });

  // --- Field Map (View 2) ---
  const fieldMap = L.map('field-map', {
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: false,
    layers: [L.tileLayer(mapboxUrl, { maxZoom: 19 })] // duplicate instance for independent control
  });
  L.control.zoom({ position: 'topright' }).addTo(fieldMap);

  // Minimap for Field view
  const osmMini = L.tileLayer(streetUrl, { minZoom: 0, maxZoom: 13 });
  new L.Control.MiniMap(osmMini, {
    position: 'bottomright',
    toggleDisplay: true,
    minimized: false,
    width: 120, height: 120
  }).addTo(fieldMap);

  // ───────────────────────────────────────────────────────────────────
  // 3. LAYER SWITCHING
  // ───────────────────────────────────────────────────────────────────
  document.querySelectorAll('.mls-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetMapName = e.target.getAttribute('data-map'); // 'audit' or 'field'
      const layerName = e.target.getAttribute('data-layer');
      
      const targetMap = targetMapName === 'audit' ? auditMap : fieldMap;
      
      // Update UI active state
      const siblings = e.target.parentElement.querySelectorAll('.mls-btn');
      siblings.forEach(s => s.classList.remove('active'));
      e.target.classList.add('active');

      // Swap layer
      targetMap.eachLayer((layer) => {
        // remove existing tile layers (but not drawn vectors)
        if (layer instanceof L.TileLayer) {
          targetMap.removeLayer(layer);
        }
      });
      
      // We need fresh instances so layers aren't shared improperly if both maps use same
      let newLayer;
      if (layerName === 'satellite') newLayer = L.tileLayer(mapboxUrl, { maxZoom: 19 });
      if (layerName === 'terrain') newLayer = L.tileLayer(terrainUrl, { maxZoom: 13 });
      if (layerName === 'street') newLayer = L.tileLayer(streetUrl, { maxZoom: 19 });
      if (layerName === 'dark') newLayer = L.tileLayer(darkUrl, { maxZoom: 20 });
      
      if (newLayer) newLayer.addTo(targetMap);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. VIEW TOGGLING
  // ───────────────────────────────────────────────────────────────────
  const btnAudit = document.getElementById('btnAudit');
  const btnField = document.getElementById('btnField');
  const viewAudit = document.getElementById('viewAudit');
  const viewField = document.getElementById('viewField');

  function switchView(viewId) {
    if (viewId === 'audit') {
      btnAudit.classList.add('active');
      btnField.classList.remove('active');
      viewAudit.classList.add('active');
      viewField.classList.remove('active');
      setTimeout(() => { auditMap.invalidateSize(); subMap1.invalidateSize(); subMap2.invalidateSize(); }, 100);
    } else {
      btnField.classList.add('active');
      btnAudit.classList.remove('active');
      viewField.classList.add('active');
      viewAudit.classList.remove('active');
      setTimeout(() => { fieldMap.invalidateSize(); }, 100);
    }
  }

  btnAudit.addEventListener('click', () => switchView('audit'));
  btnField.addEventListener('click', () => switchView('field'));

  // Ensure map sizes are correct initially
  setTimeout(() => auditMap.invalidateSize(), 500);

  // ───────────────────────────────────────────────────────────────────
  // 5. DRAWING TOOLS & FEATURE GROUPS (Leaflet Draw)
  // ───────────────────────────────────────────────────────────────────
  const drawnItemsAudit = new L.FeatureGroup();
  auditMap.addLayer(drawnItemsAudit);
  
  const drawnItemsField = new L.FeatureGroup();
  fieldMap.addLayer(drawnItemsField);

  // Determine active map & feature group dynamically
  function getActiveMapContext() {
    if (viewAudit.classList.contains('active')) {
      return { map: auditMap, fg: drawnItemsAudit };
    }
    return { map: fieldMap, fg: drawnItemsField };
  }

  // Draw handlers
  let currentDrawHandler = null;

  function startDrawMode(mode) {
    const ctx = getActiveMapContext();
    if (currentDrawHandler) {
      currentDrawHandler.disable();
    }
    
    const drawOptions = {
      shapeOptions: {
        color: '#38a1ff', // Blue for carbon overlay
        weight: 3,
        fillColor: '#38a1ff',
        fillOpacity: 0.2
      }
    };

    if (mode === 'polygon') currentDrawHandler = new L.Draw.Polygon(ctx.map, drawOptions);
    else if (mode === 'polyline') currentDrawHandler = new L.Draw.Polyline(ctx.map, drawOptions);
    else if (mode === 'circle') currentDrawHandler = new L.Draw.Circle(ctx.map, drawOptions);
    else if (mode === 'marker') currentDrawHandler = new L.Draw.Marker(ctx.map, {});

    if (currentDrawHandler) {
      currentDrawHandler.enable();
      showToast(`Drawing mode: ${mode}`);
    }
  }

  // Handle created elements for both maps
  [auditMap, fieldMap].forEach(m => {
    m.on(L.Draw.Event.CREATED, function (e) {
      const type = e.layerType;
      const layer = e.layer;
      const ctx = m === auditMap ? drawnItemsAudit : drawnItemsField;
      ctx.addLayer(layer);
      
      // Calculate area if polygon
      if (type === 'polygon') {
        const latlngs = layer.getLatLngs()[0];
        const area = L.GeometryUtil.geodesicArea(latlngs);
        const acres = (area / 4046.86).toFixed(2);
        layer.bindPopup(`Carbon Area: ${acres} acres`).openPopup();
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. TOOL PANEL (Coordinates & Draw Slide-out)
  // ───────────────────────────────────────────────────────────────────
  const panelOverlay = document.getElementById('toolPanelOverlay');
  const toolPanel = document.getElementById('toolPanel');
  const btnOpenCoords = document.getElementById('coordsPanelBtn');
  const btnCloseCoords = document.getElementById('tpClose');

  function openPanel() {
    panelOverlay.classList.add('open');
    toolPanel.classList.add('open');
  }
  function closePanel() {
    panelOverlay.classList.remove('open');
    toolPanel.classList.remove('open');
  }
  btnOpenCoords.addEventListener('click', openPanel);
  btnCloseCoords.addEventListener('click', closePanel);
  panelOverlay.addEventListener('click', closePanel);

  // Quick Locations Jump
  document.querySelectorAll('.ql-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lat = parseFloat(e.target.dataset.lat);
      const lng = parseFloat(e.target.dataset.lng);
      const zoom = parseInt(e.target.dataset.zoom);
      
      document.getElementById('gotoLat').value = lat;
      document.getElementById('gotoLng').value = lng;
      document.getElementById('gotoZoom').value = zoom;
      
      const ctx = getActiveMapContext();
      ctx.map.flyTo([lat, lng], zoom, { duration: 1.5 });
      showToast(`Flying to location...`);
    });
  });

  // Go To Coordinates
  document.getElementById('gotoBtn').addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('gotoLat').value);
    const lng = parseFloat(document.getElementById('gotoLng').value);
    let zoom = parseInt(document.getElementById('gotoZoom').value) || 14;
    if (!isNaN(lat) && !isNaN(lng)) {
      const ctx = getActiveMapContext();
      ctx.map.flyTo([lat, lng], zoom);
      showToast(`Coordinate match found.`);
    } else {
      showToast(`Please enter valid coordinates.`);
    }
  });

  // Coordinate Row Builder (for manual polygons)
  const coordRowsContainer = document.getElementById('coordRows');
  let coordRowCount = 0;

  function addCoordRow() {
    coordRowCount++;
    const row = document.createElement('div');
    row.className = 'coord-row';
    row.innerHTML = `
      <input type="number" class="tp-input coord-lat" placeholder="Lat ${coordRowCount}" step="0.0001">
      <input type="number" class="tp-input coord-lng" placeholder="Lng ${coordRowCount}" step="0.0001">
    `;
    coordRowsContainer.appendChild(row);
  }
  
  // Initialize with 3 rows (triangle minimum)
  addCoordRow(); addCoordRow(); addCoordRow();
  document.getElementById('addCoordRowBtn').addEventListener('click', addCoordRow);

  // Draw Polygon from Custom Coords
  document.getElementById('drawFromCoordsBtn').addEventListener('click', () => {
    const latInputs = document.querySelectorAll('.coord-lat');
    const lngInputs = document.querySelectorAll('.coord-lng');
    const name = document.getElementById('polyNameInput').value || 'Custom Zone';
    
    let latlngs = [];
    for(let i=0; i<latInputs.length; i++) {
      const lat = parseFloat(latInputs[i].value);
      const lng = parseFloat(lngInputs[i].value);
      if(!isNaN(lat) && !isNaN(lng)) {
        latlngs.push([lat, lng]);
      }
    }

    if(latlngs.length >= 3) {
      const ctx = getActiveMapContext();
      const polygon = L.polygon(latlngs, { color: '#7EC843', weight: 2, fillColor: '#7EC843', fillOpacity: 0.3 });
      ctx.fg.addLayer(polygon);
      ctx.map.fitBounds(polygon.getBounds());
      polygon.bindPopup(`<strong>${name}</strong><br>Carbon Audit Zone`).openPopup();
      
      const area = L.GeometryUtil.geodesicArea(latlngs);
      document.getElementById('polyResultBox').style.display = 'block';
      document.getElementById('polyAreaOut').innerText = (area / 4046.86).toFixed(2) + ' acres';
      document.getElementById('polyPerimOut').innerText = 'Generated';
      showToast('Polygon mapped successfully.');
    } else {
      showToast('Need at least 3 valid coordinate pairs.');
    }
  });

  document.getElementById('clearCoordsBtn').addEventListener('click', () => {
    coordRowsContainer.innerHTML = '';
    coordRowCount = 0;
    addCoordRow(); addCoordRow(); addCoordRow();
    document.getElementById('polyResultBox').style.display = 'none';
  });

  // Freehand Drawing buttons
  let activeDrawType = 'polygon';
  document.querySelectorAll('.dm-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.dm-btn').forEach(b => b.classList.remove('active'));
      const tgt = e.currentTarget;
      tgt.classList.add('active');
      activeDrawType = tgt.id.replace('dm', '').toLowerCase();
    });
  });

  document.getElementById('startDrawBtn').addEventListener('click', () => {
    closePanel();
    startDrawMode(activeDrawType);
  });

  document.getElementById('clearAllBtn').addEventListener('click', () => {
    drawnItemsAudit.clearLayers();
    drawnItemsField.clearLayers();
    showToast('All vector layers cleared.');
  });


  // ───────────────────────────────────────────────────────────────────
  // 7. MOCK DATA INJECTION & ANIMATIONS (UI Clones)
  // ───────────────────────────────────────────────────────────────────

  // Mock UAV Data (View 1)
  const uavs = [
    { id: 'UAV-01 Alpha', status: 'Active scanning', battery: '82%', type: 'Thermal' },
    { id: 'UAV-02 Beta', status: 'Return to base', battery: '14%', type: 'LIDAR' },
    { id: 'UAV-04 Delta', status: 'Active scanning', battery: '95%', type: 'Optical' },
    { id: 'Ground-Bot 1', status: 'Offline', battery: '--', type: 'Soil Sampler' }
  ];
  const cardsGrid = document.getElementById('cardsGrid');
  uavs.forEach(u => {
    const div = document.createElement('div');
    div.className = 'uav-card';
    div.innerHTML = `
      <div class="uav-top">
        <span class="uav-name">${u.id}</span>
        <span class="uav-status" style="color: ${u.status === 'Offline' ? 'gray' : u.battery === '14%' ? 'orange' : '#7EC843'}">${u.status}</span>
      </div>
      <div class="uav-info">Batt: ${u.battery} | ${u.type}</div>
      <div class="uav-actions">
        <button class="uav-btn"><i class="fas fa-video"></i> Feed</button>
        <button class="uav-btn"><i class="fas fa-map-marker-alt"></i> Loc</button>
      </div>
    `;
    cardsGrid.appendChild(div);
  });

  // Mock Stress List (View 2)
  const stresses = [
    { name: 'Mau Zone 4', area: '4.5 ac', priority: 'High', date: 'New' },
    { name: 'Sector 7B', area: '12.0 ac', priority: 'Medium', date: 'Jul 2' },
    { name: 'Riparian 1', area: '2.1 ac', priority: 'Low', date: 'Jul 14' }
  ];
  const stressList = document.getElementById('stressList');
  stresses.forEach((s, idx) => {
    const div = document.createElement('div');
    div.className = `stress-item ${idx === 0 ? 'active' : ''}`;
    div.innerHTML = `
      <i class="fas fa-exclamation-triangle si-icon" style="color: ${s.priority==='High'?'#ff4d4d':s.priority==='Medium'?'#ffa500':'#7EC843'}"></i>
      <div class="si-content">
        <div class="si-title">${s.name} <span class="si-badge ${s.date==='New'?'new':''}">${s.date}</span></div>
        <div class="si-desc">Carbon loss | ${s.area} | ${s.priority}</div>
      </div>
    `;
    div.addEventListener('click', () => {
      document.querySelectorAll('.stress-item').forEach(i => i.classList.remove('active'));
      div.classList.add('active');
      document.getElementById('stressPopup').style.display = 'block';
    });
    stressList.appendChild(div);
  });

  // Close Stress Popup
  document.getElementById('spClose').addEventListener('click', () => {
    document.getElementById('stressPopup').style.display = 'none';
  });


  // Thermal Canvas Animation (Mock NDVI heat camera)
  const canvas = document.getElementById('thermalCanvas');
  const ctx = canvas.getContext('2d');
  let cw, ch;
  
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    cw = canvas.width; ch = canvas.height;
  }
  window.addEventListener('resize', resizeCanvas);
  // initial delay to ensure DOM sizing
  setTimeout(() => { resizeCanvas(); drawThermal(); }, 500);

  let time = 0;
  function drawThermal() {
    if(!cw || !ch) return requestAnimationFrame(drawThermal);
    
    // Base gradient
    const grd = ctx.createLinearGradient(0, 0, cw, ch);
    grd.addColorStop(0, "#00204a"); // cool
    grd.addColorStop(0.5, "#005b96");
    grd.addColorStop(1, "#b3cde0");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, cw, ch);

    // Animated "heat" blobs representing carbon density
    ctx.globalCompositeOperation = 'screen';
    for(let i=0; i<4; i++) {
      const x = cw/2 + Math.sin(time*0.02 + i)*50;
      const y = ch/2 + Math.cos(time*0.03 + i)*30;
      const r = 40 + Math.sin(time*0.05 + i)*10;
      
      const rad = ctx.createRadialGradient(x, y, 0, x, y, r);
      rad.addColorStop(0, i===0 ? 'rgba(255,50,50,0.8)' : 'rgba(126,200,67,0.8)'); // Red = deforestation, Green = healthy
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Scanline effect
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    const scanY = (time * 2) % ch;
    ctx.fillRect(0, scanY, cw, 2);

    time++;
    requestAnimationFrame(drawThermal);
  }

  // Toast Helper
  function showToast(msg) {
    const toast = document.getElementById('mapToast');
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  // Add dummy heatmap layer to field map to match the "NDVI scale" aesthetic
  const heatPoints = [
    [-0.5023, 35.4156, 0.8], [-0.503, 35.416, 0.5], [-0.501, 35.414, 0.9],
    [-0.504, 35.417, 0.3], [-0.505, 35.412, 0.7]
  ];
  if (typeof L.heatLayer !== 'undefined') {
    L.heatLayer(heatPoints, {radius: 40, blur: 20, maxZoom: 16, gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}}).addTo(fieldMap);
  }

  // Draw static NDVI gradient bar
  const nCanvas = document.getElementById('ndviScaleCanvas');
  const nCtx = nCanvas.getContext('2d');
  const nGrd = nCtx.createLinearGradient(0,0,0,220);
  nGrd.addColorStop(0, '#00ff00'); // Healthy
  nGrd.addColorStop(0.5, '#ffff00'); // Moderate
  nGrd.addColorStop(1, '#ff0000'); // Stressed
  nCtx.fillStyle = nGrd;
  nCtx.fillRect(0,0,16,220);

});
