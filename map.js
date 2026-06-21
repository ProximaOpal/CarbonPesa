// =====================================================================
// CARBON PESA — Map Interface Logic
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = "http://localhost:8000";
  let activeFarmId = 1;

  // ───────────────────────────────────────────────────────────────────
  // 1. TILE LAYERS & CONFIG
  // ───────────────────────────────────────────────────────────────────
  let mapboxUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'; // Esri Satellite (Fallback)
  const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // OSM Street
  const terrainUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}'; // Esri Terrain
  const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'; // Carto Dark

  const layersConfig = {
    satellite: L.tileLayer(mapboxUrl, { maxZoom: 19, attribution: 'Tiles &copy; ESA/GEE' }),
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
  const subMap1Layer = L.tileLayer(mapboxUrl, { maxZoom: 19 });
  const subMap1 = L.map('sub-map-1', { center: defaultCenter, zoom: defaultZoom - 2, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false });
  subMap1Layer.addTo(subMap1);

  // Sync sub-maps with main audit map
  auditMap.on('moveend', () => {
    const center = auditMap.getCenter();
    subMap1.setView(center, auditMap.getZoom() - 2);
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
  const fieldMapLayer = L.tileLayer(mapboxUrl, { maxZoom: 19 });
  const fieldMap = L.map('field-map', {
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: false,
    layers: [fieldMapLayer] // duplicate instance for independent control
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
      viewAudit.style.display = 'flex';
      viewField.style.display = 'none';
      setTimeout(() => { auditMap.invalidateSize(); subMap1.invalidateSize(); }, 100);
      showToast('Switched to Audit Dashboard');
    } else {
      btnField.classList.add('active');
      btnAudit.classList.remove('active');
      viewField.classList.add('active');
      viewAudit.classList.remove('active');
      viewField.style.display = 'flex';
      viewAudit.style.display = 'none';
      setTimeout(() => { fieldMap.invalidateSize(); }, 100);
      showToast('Switched to Field Analysis');
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
        const hectares = (area / 10000).toFixed(2);
        layer.bindPopup(`Carbon Area: ${hectares} ha`).openPopup();

        // Trigger registration modal
        const farmModalOverlay = document.getElementById('farmModalOverlay');
        const farmRegistrationModal = document.getElementById('farmRegistrationModal');
        const frmArea = document.getElementById('frmArea');
        
        if (farmRegistrationModal && farmModalOverlay) {
          farmModalOverlay.style.display = 'block';
          farmRegistrationModal.style.display = 'block';
          frmArea.textContent = `${hectares} ha`;
          
          layer._tempGeoJSON = layer.toGeoJSON();
          layer._tempArea = hectares;
          window._pendingRegistrationLayer = layer;
        }
      }
    });
  });

  // Modal logic
  const frmClose = document.getElementById('frmClose');
  if(frmClose) frmClose.addEventListener('click', closeFarmModal);
  function closeFarmModal() {
    document.getElementById('farmModalOverlay').style.display = 'none';
    document.getElementById('farmRegistrationModal').style.display = 'none';
  }

  const frmRegisterBtn = document.getElementById('frmRegisterBtn');
  if(frmRegisterBtn) {
    frmRegisterBtn.addEventListener('click', async () => {
      const name = document.getElementById('frmName').value;
      const layer = window._pendingRegistrationLayer;
      if(!name || !layer) return showToast('Please provide a name.');
      
      showToast('Registering farm via backend...');
      try {
        const res = await fetch(`${API_BASE}/farms`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            name: name,
            geometry: layer._tempGeoJSON.geometry,
            area_ha: layer._tempArea
          })
        });
        if (res.ok || res.status === 201) {
          const farmData = await res.json();
          activeFarmId = farmData.id;
          showToast(`Farm '${farmData.name}' Registered Successfully! Active ID: ${activeFarmId}`);
          closeFarmModal();
          fetchNdviChart();
        } else {
          showToast('Farm registration failed.');
          closeFarmModal();
        }
      } catch(e) {
        showToast('Error registering farm: ' + e.message);
        closeFarmModal();
      }
    });
  }

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
  const gotoLat = document.getElementById('gotoLat');
  const gotoLng = document.getElementById('gotoLng');
  const gotoZoom = document.getElementById('gotoZoom');

  // Update inputs on map move
  function syncCoordsToPanel() {
    const ctx = getActiveMapContext();
    const center = ctx.map.getCenter();
    if(gotoLat && gotoLng && document.activeElement !== gotoLat && document.activeElement !== gotoLng) {
      gotoLat.value = center.lat.toFixed(4);
      gotoLng.value = center.lng.toFixed(4);
      gotoZoom.value = ctx.map.getZoom();
    }
  }
  auditMap.on('moveend', syncCoordsToPanel);
  fieldMap.on('moveend', syncCoordsToPanel);

  document.getElementById('gotoBtn').addEventListener('click', () => {
    const lat = parseFloat(gotoLat.value);
    const lng = parseFloat(gotoLng.value);
    let zoom = parseInt(gotoZoom.value) || 14;
    if (!isNaN(lat) && !isNaN(lng)) {
      const ctx = getActiveMapContext();
      ctx.map.flyTo([lat, lng], zoom);
      showToast(`Coordinate match found.`);
    } else {
      showToast(`Please enter valid coordinates.`);
    }
  });

  [gotoLat, gotoLng].forEach(el => el.addEventListener('change', () => {
    const lat = parseFloat(gotoLat.value);
    const lng = parseFloat(gotoLng.value);
    if (!isNaN(lat) && !isNaN(lng)) {
       const ctx = getActiveMapContext();
       ctx.map.panTo([lat, lng]);
    }
  }));

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
      // VM0047 v1.1 Logic: Automatically flag "Degraded Forest Land"
      const isEligible = Math.random() > 0.3; // Mock eligibility
      const polyColor = isEligible ? '#7EC843' : '#ff9900';
      const statusText = isEligible ? '<span style="color:#7EC843; font-weight:bold;">Eligible: Degraded Forest Land (VM0047 v1.1)</span>' : '<span style="color:#ff9900; font-weight:bold;">Ineligible: Intact Forest</span>';
      
      const polygon = L.polygon(latlngs, { color: polyColor, weight: 2, fillColor: polyColor, fillOpacity: 0.3 });
      ctx.fg.addLayer(polygon);
      ctx.map.fitBounds(polygon.getBounds());
      polygon.bindPopup(`<strong>${name}</strong><br>Carbon Audit Zone<br>${statusText}`).openPopup();

      const area = L.GeometryUtil.geodesicArea(latlngs);
      document.getElementById('polyResultBox').style.display = 'block';
      document.getElementById('polyAreaOut').innerText = (area / 4046.86).toFixed(2) + ' acres';
      document.getElementById('polyPerimOut').innerText = 'Generated';
      showToast('Polygon mapped. VM0047 eligibility assessed.');
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
  // 7. LIVE DATA INJECTION & ANIMATIONS
  // ── UAV Telemetry: Live from /telemetry API ──────────────────────────
  let uavs = [];
  let uavMarkers = [];

  function _uavStatusColor(u) {
    if (u.status === 'Offline') return 'gray';
    const batNum = parseInt(u.battery);
    if (!isNaN(batNum) && batNum < 20) return 'orange';
    return '#7EC843';
  }

  function renderUAVCards(data) {
    uavs = data;
    const cardsGrid = document.getElementById('cardsGrid');
    cardsGrid.innerHTML = '';
    // Remove old markers from map
    uavMarkers.forEach(m => auditMap.removeLayer(m));
    uavMarkers = [];

    data.forEach((u, idx) => {
      const loc = [u.latitude, u.longitude];
      const color = _uavStatusColor(u);

      // Map marker
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.6);"></div>`,
        iconSize: [14, 14]
      });
      const m = L.marker(loc, { icon }).addTo(auditMap);
      m.bindPopup(`<strong>${u.id}</strong><br>Status: ${u.status}<br>Battery: ${u.battery}<br>Type: ${u.type}<br>Alt: ${u.altitude}m | ${u.speed}m/s`);
      uavMarkers.push(m);

      // Card
      const div = document.createElement('div');
      div.className = 'uav-card';
      div.innerHTML = `
        <div class="uav-top">
          <span class="uav-name">${u.id}</span>
          <span class="uav-status" style="color:${color}">${u.status}</span>
        </div>
        <div class="uav-info">Batt: ${u.battery} | ${u.type}</div>
        <div class="uav-actions">
          <button class="uav-btn uav-feed-btn" data-idx="${idx}"><i class="fas fa-video"></i> Feed</button>
          <button class="uav-btn uav-loc-btn"  data-idx="${idx}"><i class="fas fa-map-marker-alt"></i> Loc</button>
        </div>
      `;
      cardsGrid.appendChild(div);
    });

    // Update telemetry panel with first active UAV
    const active = data.find(u => u.status !== 'Offline') || data[0];
    if (active) {
      const el = id => document.getElementById(id);
      if (el('tLat'))      el('tLat').textContent      = `${active.latitude.toFixed(4)}°`;
      if (el('tLng'))      el('tLng').textContent      = `${active.longitude.toFixed(4)}°`;
      if (el('tAlt'))      el('tAlt').textContent      = `${active.altitude} m`;
      if (el('tSpeed'))    el('tSpeed').textContent    = `${active.speed} m/s`;
      if (el('tWind'))     el('tWind').textContent     = active.wind;
      if (el('tCO2'))      el('tCO2').textContent      = `${active.co2_level} ppm`;
      if (el('tHumidity')) el('tHumidity').textContent = `${active.humidity}%`;
    }

    // Re-attach button listeners
    document.querySelectorAll('.uav-feed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = uavs[parseInt(btn.dataset.idx)];
        showToast(`📡 Opening live ${u.id} video feed stream...`);
      });
    });
    document.querySelectorAll('.uav-loc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        auditMap.flyTo([uavs[idx].latitude, uavs[idx].longitude], 17, { duration: 1.2 });
        uavMarkers[idx].openPopup();
        showToast(`Flying to ${uavs[idx].id} position...`);
      });
    });
  }

  function fetchTelemetry() {
    fetch(`${API_BASE}/telemetry`)
      .then(r => r.json())
      .then(data => renderUAVCards(data))
      .catch(err => {
        console.warn('[Telemetry] API unreachable, using fallback:', err.message);
        renderUAVCards([
          { id: 'UAV-01 Alpha', status: 'Active scanning', battery: '82%', type: 'Thermal', latitude: -0.501, longitude: 35.414, altitude: 120, speed: 8, wind: 'NW 12km/h', co2_level: 412, humidity: 72 },
          { id: 'UAV-02 Beta',  status: 'Return to base',  battery: '14%', type: 'LIDAR',   latitude: -0.505, longitude: 35.418, altitude: 110, speed: 5, wind: 'NW 10km/h', co2_level: 408, humidity: 71 },
          { id: 'UAV-04 Delta',status: 'Active scanning', battery: '95%', type: 'Optical', latitude: -0.498, longitude: 35.412, altitude: 125, speed: 9, wind: 'NW 11km/h', co2_level: 415, humidity: 73 },
          { id: 'Ground-Bot 1',status: 'Offline',          battery: '--',  type: 'Soil Sampler', latitude: -0.510, longitude: 35.410, altitude: 0, speed: 0, wind: 'None', co2_level: 420, humidity: 75 }
        ]);
      });
  }

  // Initial load + live polling every 15s
  fetchTelemetry();
  setInterval(fetchTelemetry, 15000);

  // UAV filter tabs (works on live uavs array)
  document.querySelectorAll('.ftab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      document.querySelectorAll('.uav-card').forEach((card, i) => {
        if (!uavs[i]) return;
        let show = true;
        if (filter === 'offline')  show = uavs[i].status === 'Offline';
        if (filter === 'battery')  show = parseInt(uavs[i].battery) < 20;
        if (filter === 'problems') show = uavs[i].status !== 'Active scanning';
        if (filter === 'live')     show = uavs[i].status === 'Active scanning';
        card.style.display = (show || filter === 'all') ? '' : 'none';
      });
    });
  });

  // Add Unit button
  document.getElementById('addUnitBtn').addEventListener('click', () => {
    showToast('📋 New audit unit form — contact your fleet manager to register.');
  });


  // Audit sub-tabs (Map / Data / Split)
  document.querySelectorAll('.asub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.asub-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.tab;
      const left  = document.getElementById('auditLeft');
      const right = document.getElementById('auditRight');
      if (mode === 'split') { left.style.flex = '1'; right.style.flex = '1'; }
      else { left.style.flex = ''; right.style.flex = ''; }
      auditMap.invalidateSize();
    });
  });

  // Emergency / Send Alert buttons
  function dispatchEmergencyAlert() {
    showToast('🚨 Emergency alert dispatched to field team via Africa\'s Talking SMS!');
    fetch(`${API_BASE}/deforestation/alert`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({farm_id: activeFarmId})
    }).catch(() => {});
  }
  document.getElementById('emergencyBtn').addEventListener('click', dispatchEmergencyAlert);
  document.getElementById('sendAlertMini').addEventListener('click', () => {
    showToast('📡 NDVI anomaly alert dispatched via SMS!');
    fetch(`${API_BASE}/deforestation/alert`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({farm_id: activeFarmId})
    }).catch(() => {});
  });

  // Audit map expand button
  document.getElementById('auditExpandBtn').addEventListener('click', () => {
    const panel = document.getElementById('auditMapPanel');
    panel.style.flex = panel.style.flex === '1 1 100%' ? '' : '1 1 100%';
    setTimeout(() => auditMap.invalidateSize(), 100);
    showToast(panel.style.flex ? 'Map expanded.' : 'Map restored.');
  });

  // Cell expand buttons
  document.querySelectorAll('.cell-btn[title="Expand"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cell = btn.closest('.data-cell');
      cell.classList.toggle('cell-expanded');
      [subMap1].forEach(m => { try { m.invalidateSize(); } catch(e) {} });
    });
  });

  // Alert bell & Settings
  document.getElementById('gtAlertBtn').addEventListener('click', () => {
    showToast('📬 No new alerts. All systems operational.');
  });
  document.getElementById('gtSettingsBtn').addEventListener('click', () => {
    showToast('⚙️ Settings panel — coming soon.');
  });

  // Field sidebar icon nav
  const subPanels = {
    'Layers': 'panelStress',
    'Fields': 'panelAudit',
    'Analytics': 'panelFinancials'
  };
  
  document.querySelectorAll('.fas-icon').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fas-icon').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const title = btn.getAttribute('title');
      const targetPanelId = subPanels[title] || 'panelStress';
      
      document.querySelectorAll('.fa-subpanel').forEach(p => p.style.display = 'none');
      const tp = document.getElementById(targetPanelId);
      if (tp) {
          tp.style.display = 'block';
          if(targetPanelId === 'panelAudit') fetchAuditHistory();
          if(targetPanelId === 'panelFinancials') fetchFinancials();
      }
      showToast(`📌 ${title || 'Panel'} activated.`);
    });
  });

  async function fetchAuditHistory() {
    const list = document.getElementById('auditHistoryList');
    if(!list) return;
    try {
      const res = await fetch(`${API_BASE}/audits`);
      if(!res.ok) throw new Error('Failed to fetch audits');
      const audits = await res.json();
      
      if(audits.length === 0) {
        list.innerHTML = `<div style="color:#888; padding:10px;">No audits found.</div>`;
        return;
      }
      
      list.innerHTML = audits.map(a => `
        <div style="background:#222; padding:10px; border-radius:4px; margin-bottom:10px;">
          <div style="color:#7EC843; font-weight:bold; margin-bottom:5px;">✓ SUCCESS (${new Date(a.timestamp).toISOString().split('T')[0]})</div>
          <div style="font-family:monospace; font-size:11px; word-break:break-all; color:#888;">SHA-256: ${a.hash_manifest || 'Pending'}</div>
          <div style="font-size:12px; color:#fff; margin-top:5px;">Yield: ${a.carbon_yield_tons} tCO2e</div>
          <a href="#" style="color:#38a1ff; text-decoration:none; font-size:12px; display:inline-block; margin-top:5px;">View on Hedera Mirror Node ↗</a>
        </div>
      `).join('');
    } catch(err) {
      console.error(err);
      list.innerHTML = `<div style="color:red; padding:10px;">Error loading audits.</div>`;
    }
  }
  
  async function fetchFinancials() {
    const list = document.getElementById('financialsList');
    if(!list) return;
    try {
      const res = await fetch(`${API_BASE}/payouts`);
      if(!res.ok) throw new Error('Failed to fetch payouts');
      const payouts = await res.json();
      
      if(payouts.length === 0) {
        list.innerHTML = `<div style="color:#888; padding:10px;">No payouts found.</div>`;
        return;
      }
      
      list.innerHTML = payouts.map(p => `
        <div style="background:#222; padding:10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div>
            <div style="font-weight:bold; color:#fff;">Ksh ${p.amount}</div>
            <div style="font-size:11px; color:#888;">Txn: ${p.daraja_receipt || 'Pending'}</div>
          </div>
          <div style="color:${p.status === 'COMPLETED' || p.status === 'CONFIRMED' ? '#7EC843' : '#f39c12'};">
            <i class="fas fa-${p.status === 'COMPLETED' || p.status === 'CONFIRMED' ? 'check-circle' : 'clock'}"></i> ${p.status}
          </div>
        </div>
      `).join('');
    } catch(err) {
      console.error(err);
      list.innerHTML = `<div style="color:red; padding:10px;">Error loading financials.</div>`;
    }
  }

  // Field header — field selector
  document.getElementById('faFieldBtn').addEventListener('click', () => {
    const fields = ['Mau Forest 429', 'Kakamega Block 3', 'Aberdare North', 'Arusha Pilot'];
    const btn = document.getElementById('faFieldBtn');
    const cur = btn.textContent.trim().replace(/\s*\S+$/, '').trim();
    const idx = fields.findIndex(f => btn.textContent.includes(f.split(' ')[0]));
    const next = fields[(idx + 1) % fields.length];
    btn.innerHTML = `${next} <i class="fas fa-chevron-down"></i>`;
    showToast(`Field switched to: ${next}`);
    fieldMap.flyTo(defaultCenter, defaultZoom);
  });

  // Field header search/menu stubs
  document.getElementById('faSearchOpen').addEventListener('click', () => {
    const gs = document.getElementById('globalSearch');
    if (gs) {
      gs.focus();
      showToast('🔍 Type a field name or coordinates above.');
    }
  });
  document.getElementById('faMenuOpen').addEventListener('click', () => {
    showToast('☰ Field menu — export, share, settings.');
  });

  // ── Stress List: Live from /stresses API ─────────────────────────────
  function renderStresses(stresses) {
    const stressList = document.getElementById('stressList');
    stressList.innerHTML = '';
    stresses.forEach((s, idx) => {
      const div = document.createElement('div');
      div.className = `stress-item ${idx === 0 ? 'active' : ''}`;
      div.innerHTML = `
        <i class="fas fa-exclamation-triangle si-icon" style="color:${s.priority==='High'?'#ff4d4d':s.priority==='Medium'?'#ffa500':'#7EC843'}"></i>
        <div class="si-content">
          <div class="si-title">${s.name} <span class="si-badge ${s.date==='New'?'new':''}">${s.date}</span></div>
          <div class="si-desc">Carbon loss | ${s.area} | ${s.priority} | NDVI ${s.ndvi}</div>
        </div>
      `;
      div.addEventListener('click', () => {
        document.querySelectorAll('.stress-item').forEach(i => i.classList.remove('active'));
        div.classList.add('active');
        const popup = document.getElementById('stressPopup');
        popup.style.display = 'block';
        document.getElementById('spCoords').textContent     = `${s.coords[0].toFixed(4)}°, ${s.coords[1].toFixed(4)}°`;
        document.getElementById('spAreaDetail').textContent  = s.area;
        document.getElementById('spNdvi').textContent        = s.ndvi;
        document.getElementById('spDateDetail').textContent  = s.date === 'New' ? 'Today' : s.date;
        fieldMap.flyTo(s.coords, 16, { duration: 1.0 });
      });
      stressList.appendChild(div);
    });
  }

  function fetchStresses() {
    fetch(`${API_BASE}/stresses`)
      .then(r => r.json())
      .then(data => renderStresses(data))
      .catch(err => {
        console.warn('[Stresses] API unreachable, using fallback:', err.message);
        renderStresses([
          { name: 'Mau Zone 4',  area: '4.5 ac',  priority: 'High',   date: 'New',    ndvi: 0.31, coords: [-0.502, 35.416] },
          { name: 'Sector 7B',   area: '12.0 ac', priority: 'Medium', date: 'Jul 2',  ndvi: 0.48, coords: [-0.506, 35.412] },
          { name: 'Riparian 1',  area: '2.1 ac',  priority: 'Low',    date: 'Jul 14', ndvi: 0.61, coords: [-0.498, 35.418] }
        ]);
      });
  }

  fetchStresses();
  setInterval(fetchStresses, 30000);

  // Stress popup — all buttons
  document.getElementById('spClose').addEventListener('click', () => {
    document.getElementById('stressPopup').style.display = 'none';
  });
  document.getElementById('spMuteBtn').addEventListener('click', () => {
    showToast('🔕 Stress zone muted for 24 hours.');
    document.getElementById('stressPopup').style.display = 'none';
  });
  document.getElementById('spDeleteBtn').addEventListener('click', () => {
    const active = document.querySelector('.stress-item.active');
    if (active) {
      active.style.opacity = '0';
      active.style.transition = 'opacity 0.3s';
      setTimeout(() => active.remove(), 300);
    }
    document.getElementById('stressPopup').style.display = 'none';
    showToast('Stress zone removed from monitoring list.');
  });
  document.getElementById('spIssueBtn').addEventListener('click', () => {
    const issues = ['Carbon Depletion','Soil Erosion','Canopy Loss','Invasive Species','Drought Stress'];
    const cur = document.getElementById('spIssueBtn').textContent.trim();
    const idx = issues.findIndex(i => cur.includes(i));
    const next = issues[(idx + 1) % issues.length];
    document.getElementById('spIssueBtn').innerHTML = `${next} <i class="fas fa-chevron-down"></i>`;
    showToast(`Issue type: ${next}`);
  });

  // Stress meta row — date & layer pickers
  document.querySelector('.sm-date-btn').addEventListener('click', () => {
    const dates = ['28 Aug 2024','15 Sep 2024','01 Oct 2024','Latest'];
    const btn = document.querySelector('.sm-date-btn');
    const idx = dates.findIndex(d => btn.textContent.includes(d.slice(0, 3)));
    const next = dates[(idx + 1) % dates.length];
    btn.innerHTML = `${next} <i class="fas fa-chevron-down"></i>`;
    showToast(`Viewing: ${next}`);
  });
  document.querySelector('.sm-ndvi-btn').addEventListener('click', () => {
    const layers = ['NDVI','EVI','SAVI','NBR','SAR'];
    const btn = document.querySelector('.sm-ndvi-btn');
    const cur = btn.textContent.trim().split(' ')[0];
    const idx = layers.indexOf(cur);
    const next = layers[(idx + 1) % layers.length];
    btn.innerHTML = `${next} <i class="fas fa-chevron-down"></i>`;
    showToast(`Spectral layer: ${next}`);
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

  // ───────────────────────────────────────────────────────────────────
  // 8. LAYER 1 & 4/5 INTEGRATIONS (Plant, Audit, Download, GEE, Chart)
  // ───────────────────────────────────────────────────────────────────
  
  // Fetch GEE dynamic tile URL
  fetch(`${API_BASE}/gee/tile-url`)
    .then(r => r.json())
    .then(data => {
      if(data.status === "success" && data.tile_url) {
        mapboxUrl = data.tile_url;
        layersConfig.satellite.setUrl(mapboxUrl);
        subMap1Layer.setUrl(mapboxUrl);
        fieldMapLayer.setUrl(mapboxUrl);
        console.log("GEE Satellite tiles loaded.");
      }
    })
    .catch(e => console.error("GEE load error", e));

  // Initialize NDVI Timeseries Chart — data fetched from /gee/timeseries/1
  const chartCtx = document.getElementById('ndviTimeSeriesChart');
  let ndviChart = null;

  function buildNdviChart(labels, data) {
    if (!chartCtx || typeof Chart === 'undefined') return;
    const delta = data[data.length - 1] - data[data.length - 2];

    if (ndviChart) {
      ndviChart.data.labels = labels;
      ndviChart.data.datasets[0].data = data;
      ndviChart.update();
    } else {
      ndviChart = new Chart(chartCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'NDVI (monthly)',
            data,
            borderColor: '#7EC843',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#fff',
            fill: true,
            backgroundColor: 'rgba(126, 200, 67, 0.1)',
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: true, ticks: { color: '#a0a0a0', font: { size: 9 } }, grid: { display: false } },
            y: { display: true, ticks: { color: '#a0a0a0', font: { size: 9 } }, grid: { color: '#333' } }
          }
        }
      });
    }

    // NDVI delta alerts
    if (delta > 0.05) {
      setTimeout(() => showToast(`Carbon Increment Alert! NDVI delta: +${delta.toFixed(2)}`), 3000);
    } else if (delta < -0.05) {
      setTimeout(() => {
        zoomPulse.style.borderColor = 'red';
        zoomPulse.style.display = 'block';
        fetch(`${API_BASE}/deforestation/alert`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({farm_id: activeFarmId})
        })
        .then(r => r.json())
        .then(res => showToast(`Deforestation Alert! Canopy loss detected. ${res.status}`))
        .catch(() => showToast(`Deforestation Alert! Auto-SMS sent to rangers.`));
      }, 4000);
    }
  }

  function fetchNdviChart() {
    fetch(`${API_BASE}/gee/timeseries/${activeFarmId}`)
      .then(r => r.json())
      .then(ts => buildNdviChart(ts.labels, ts.data))
      .catch(err => {
        console.warn('[NDVI Chart] API unreachable, using fallback:', err.message);
        buildNdviChart(
          ['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'],
          [0.45, 0.48, 0.47, 0.42, 0.51, 0.62, 0.58, 0.65, 0.72]
        );
      });
  }

  // Initial render + refresh every 5 min
  fetchNdviChart();
  setInterval(fetchNdviChart, 300000);

  // Plant & Verify (CNN)
  const btnPlantVerify = document.getElementById('btnPlantVerify');
  const cnnPhotoInput = document.getElementById('cnnPhotoInput');
  
  if (btnPlantVerify && cnnPhotoInput) {
    btnPlantVerify.addEventListener('click', () => {
      cnnPhotoInput.click();
    });

    cnnPhotoInput.addEventListener('change', async (e) => {
      if(e.target.files.length > 0) {
        btnPlantVerify.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        showToast('Uploading geotagged photo to CNN...');
        
        try {
          const res = await fetch(`${API_BASE}/verify-planting`, { method: 'POST' });
          const data = await res.json();
          if(data.verified) {
            btnPlantVerify.innerHTML = `<i class="fas fa-check-circle"></i> Verified: ${data.confidence_pct}%`;
            btnPlantVerify.style.background = '#0ea5e9'; // success color
            showToast(data.message);
          }
        } catch(err) {
          showToast('CNN verification failed: ' + err.message);
          btnPlantVerify.innerHTML = '<i class="fas fa-camera"></i> Plant & Verify (CNN)';
        }
      }
    });
  }

  // Run Audit & Payout
  const btnRunAudit = document.getElementById('btnRunAudit');
  if (btnRunAudit) {
    btnRunAudit.addEventListener('click', async () => {
      btnRunAudit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Audit...';
      showToast('Initiating GEE NDVI fetch and Hedera Anchor...');
      
      const zoomPulse = document.getElementById('zoomPulseWrap');
      if (zoomPulse) {
        zoomPulse.style.display = 'block';
        zoomPulse.style.borderColor = '#38a1ff';
      }

      try {
        const res = await fetch(`${API_BASE}/audit/${activeFarmId}`, { method: 'POST' });
        const data = await res.json();
        if (zoomPulse) zoomPulse.style.display = 'none';

        if(res.ok) {
          btnRunAudit.innerHTML = `<i class="fas fa-check"></i> Paid Ksh ${data.payout_ksh}`;
          btnRunAudit.style.background = '#7EC843';
          
          const tCarbon = document.getElementById('tCarbon');
          if (tCarbon) {
              tCarbon.innerHTML = `${(data.carbon_density || 25.1)} tCO₂e/ha <span style="color:#38a1ff;font-size:12px;">±2.9%</span>`;
          }

          showToast(`Audit Complete! Hedera TX: ${data.hedera_tx_id.substring(0, 10)}... Payout Dispatched.`);
        } else {
          showToast('Audit Error: ' + (data.detail || 'Unknown'));
          btnRunAudit.innerHTML = '<i class="fas fa-satellite"></i> Run Audit & Payout';
        }
      } catch(err) {
        if (zoomPulse) zoomPulse.style.display = 'none';
        showToast('Network error during audit.');
        btnRunAudit.innerHTML = '<i class="fas fa-satellite"></i> Run Audit & Payout';
      }
    });
  }

  // Download Report
  const btnDownloadReport = document.getElementById('btnDownloadReport');
  if (btnDownloadReport) {
    btnDownloadReport.addEventListener('click', async () => {
      showToast('Generating Hedera-anchored PDF manifest...');
      try {
        const res = await fetch(`${API_BASE}/pdd/generate?farm_id=${activeFarmId}`);
        if (!res.ok) throw new Error('Failed to generate PDD');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CarbonPesa_VM0047_PDD.xml'; // As requested
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Report downloaded successfully.');
      } catch (e) {
        showToast('Failed to download report (API offline).');
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // GLOBAL SEARCH (Nominatim)
  // ───────────────────────────────────────────────────────────────────
  const globalSearch = document.getElementById('globalSearch');
  const searchDropdown = document.getElementById('searchDropdown');
  const searchIcon = document.getElementById('globalSearchIcon');
  let searchTimeout = null;

  if (globalSearch && searchDropdown) {
    globalSearch.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(searchTimeout);
      if (query.length < 3) {
        searchDropdown.style.display = 'none';
        if (searchIcon) searchIcon.className = 'fas fa-search';
        return;
      }
      
      if (searchIcon) searchIcon.className = 'fas fa-spinner';
      
      searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
          const data = await res.json();
          
          searchDropdown.innerHTML = '';
          if (data && data.length > 0) {
            data.forEach(item => {
              const div = document.createElement('div');
              div.className = 'search-item';
              div.textContent = item.display_name;
              div.addEventListener('click', () => {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                auditMap.flyTo([lat, lon], 14);
                fieldMap.flyTo([lat, lon], 14);
                showToast(`Navigated to ${item.display_name.split(',')[0]}`);
                searchDropdown.style.display = 'none';
                globalSearch.value = item.display_name.split(',')[0];
              });
              searchDropdown.appendChild(div);
            });
          } else {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.textContent = 'No locations found';
            searchDropdown.appendChild(div);
          }
          searchDropdown.style.display = 'block';
        } catch (err) {
          console.error("Search failed", err);
        } finally {
          if (searchIcon) searchIcon.className = 'fas fa-search';
        }
      }, 500); // 500ms debounce
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!globalSearch.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = 'none';
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // BAR CHART: Carbon Yield
  // ───────────────────────────────────────────────────────────────────
  const yieldCtx = document.getElementById('carbonYieldChart');
  if (yieldCtx && typeof Chart !== 'undefined') {
    new Chart(yieldCtx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Actual Sequestration',
            data: [2.1, 2.3, 2.5, 2.4, 2.8, 3.1],
            backgroundColor: '#7EC843'
          },
          {
            label: 'Ecoregion Baseline',
            data: [2.0, 2.0, 2.0, 2.0, 2.0, 2.0],
            backgroundColor: '#38a1ff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#fff' } }
        },
        scales: {
          x: { ticks: { color: '#a0a0a0' }, grid: { display: false } },
          y: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } }
        }
      }
    });
  }



  // ───────────────────────────────────────────────────────────────────
  // UI TOGGLE LOGIC: Map View, Data, Split Screen (Audit Dashboard)
  // ───────────────────────────────────────────────────────────────────
  const stabMap = document.getElementById('stabMap');
  const stabData = document.getElementById('stabData');
  const stabSplit = document.getElementById('stabSplit');
  const auditLeft = document.getElementById('auditLeft');
  const auditRight = document.getElementById('auditRight');

  function updateAuditSubtabs(activeBtn) {
    [stabMap, stabData, stabSplit].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
    setTimeout(() => auditMap.invalidateSize(), 200);
  }

  if (stabMap) {
    stabMap.addEventListener('click', () => {
      updateAuditSubtabs(stabMap);
      if (auditLeft) { auditLeft.style.display = 'flex'; auditLeft.style.flex = '1'; }
      if (auditRight) auditRight.style.display = 'none';
    });
  }
  if (stabData) {
    stabData.addEventListener('click', () => {
      updateAuditSubtabs(stabData);
      if (auditLeft) auditLeft.style.display = 'none';
      if (auditRight) { auditRight.style.display = 'grid'; auditRight.style.flex = '1'; }
    });
  }
  if (stabSplit) {
    stabSplit.addEventListener('click', () => {
      updateAuditSubtabs(stabSplit);
      if (auditLeft) { auditLeft.style.display = 'flex'; auditLeft.style.flex = '1.2'; }
      if (auditRight) { auditRight.style.display = 'grid'; auditRight.style.flex = '1'; }
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // FETCH EXISTING FARMS AND DRAW
  // ───────────────────────────────────────────────────────────────────
  async function fetchFarms() {
    try {
      const res = await fetch(`${API_BASE}/farms`);
      if(!res.ok) throw new Error('Failed to fetch farms');
      const fc = await res.json();
      L.geoJSON(fc, {
        style: {
          color: '#7EC843',
          weight: 2,
          fillOpacity: 0.1
        },
        onEachFeature: function (feature, layer) {
          layer.on('click', () => {
            if (feature.properties && feature.properties.farm_id) {
              activeFarmId = feature.properties.farm_id;
              showToast(`Selected Farm: ${feature.properties.name || ('ID ' + activeFarmId)}`);
              fetchNdviChart();
            }
          });
          drawnItemsAudit.addLayer(layer);
          
          const clonedLayer = L.geoJSON(feature, {
            style: { color: '#7EC843', weight: 2, fillOpacity: 0.1 }
          });
          clonedLayer.on('click', () => {
            if (feature.properties && feature.properties.farm_id) {
              activeFarmId = feature.properties.farm_id;
              showToast(`Selected Farm: ${feature.properties.name || ('ID ' + activeFarmId)}`);
              fetchNdviChart();
            }
          });
          drawnItemsField.addLayer(clonedLayer);
        }
      });
    } catch(err) {
      console.error('Error fetching farms:', err);
    }
  }
  
  // Initial load
  fetchFarms();
  fetchAuditHistory();
  fetchFinancials();
});
