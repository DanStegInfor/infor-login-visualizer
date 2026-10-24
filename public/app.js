// app.js — frontend logic: fetch data, render KPIs / map / charts / table.

const state = { period: '24h', user: '' };

let map, markerLayer;

function initMap() {
  map = L.map('map', { worldCopyJump: true }).setView([20, 10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  markerLayer = L.markerClusterGroup({ maxClusterRadius: 40 });
  map.addLayer(markerLayer);
}

function showStatus(msg) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function fmtDuration(sec) {
  if (!sec || sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function renderKpis(k) {
  const cards = [
    { label: 'Logins', value: k.logins, cls: 'accent', sub: `${k.logouts} logouts` },
    { label: 'Distinct users', value: k.distinctUsers, cls: '' },
    { label: 'Countries', value: k.distinctCountries, cls: 'green' },
    { label: 'Avg session', value: fmtDuration(k.avgSessionSec), cls: '', sub: `median ${fmtDuration(k.medianSessionSec)}` },
    { label: 'MFA logins', value: `${k.mfaPct}%`, cls: 'green', sub: `${k.mfaLogins} of ${k.logins}` },
    { label: 'Office / private IP', value: k.privateIpLogins, cls: 'warn', sub: 'internal network' },
  ];
  document.getElementById('kpis').innerHTML = cards.map((c) => `
    <div class="kpi ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub || '&nbsp;'}</div>
    </div>`).join('');
}

function renderMap(points) {
  markerLayer.clearLayers();
  let maxCount = Math.max(1, ...points.map((p) => p.count));
  for (const p of points) {
    const r = 6 + 14 * (p.count / maxCount);
    const m = L.circleMarker([p.lat, p.lon], {
      radius: r, color: '#4f9cff', weight: 1.5,
      fillColor: '#38d39f', fillOpacity: 0.65,
    });
    m.bindPopup(
      `<b>${p.city || 'Unknown'}, ${p.country || ''}</b><br>` +
      `${p.count} login${p.count === 1 ? '' : 's'}<br>` +
      `${p.users} user${p.users === 1 ? '' : 's'}`
    );
    markerLayer.addLayer(m);
  }
  document.getElementById('mapMeta').textContent =
    `${points.length} location${points.length === 1 ? '' : 's'}`;
}

function renderBars(elId, rows, nameKey, valKey) {
  const el = document.getElementById(elId);
  if (!rows.length) { el.innerHTML = '<div class="meta">No data</div>'; return; }
  const max = Math.max(...rows.map((r) => r[valKey]));
  el.innerHTML = rows.map((r) => `
    <div class="bar-row">
      <div class="name" title="${r[nameKey]}">${r[nameKey]}</div>
      <div class="track"><div class="fill" style="width:${(r[valKey] / max) * 100}%"></div></div>
      <div class="n">${r[valKey]}</div>
    </div>`).join('');
}

function renderTimeline(timeline) {
  const el = document.getElementById('timeline');
  if (!timeline.length) { el.innerHTML = '<div class="meta">No data</div>'; return; }
  const max = Math.max(...timeline.map((t) => t.count));
  el.innerHTML = timeline.map((t) =>
    `<div class="spark" style="height:${(t.count / max) * 100}%" title="${t.hour}:00 — ${t.count} logins"></div>`
  ).join('');
}

function renderTable(events) {
  const tbody = document.querySelector('#eventsTable tbody');
  tbody.innerHTML = events.map((e) => `
    <tr>
      <td>${(e.logTime || '').replace('T', ' ').replace(/\..*/, '')}</td>
      <td><span class="pill ${e.action}">${e.action}</span></td>
      <td title="${e.fullName}">${e.userName}</td>
      <td>${e.city || ''}</td>
      <td>${e.country || ''}</td>
      <td>${e.ip || ''}${e.isPrivate ? ' <span class="pill priv">priv</span>' : ''}</td>
      <td>${fmtDuration(e.sessionDuration)}</td>
      <td>${e.mfaEnabled ? '✓' : ''}</td>
    </tr>`).join('');
  document.getElementById('tableMeta').textContent = `${events.length} shown`;
}

async function loadUsers() {
  const resp = await fetch(`/api/users?period=${state.period}`);
  const data = await resp.json();
  const sel = document.getElementById('userSelect');
  const current = state.user;
  sel.innerHTML = '<option value="">All users</option>' +
    (data.users || []).map((u) =>
      `<option value="${u.userName}">${u.userName}${u.fullName ? ' — ' + u.fullName : ''}</option>`
    ).join('');
  sel.value = current;
}

async function load() {
  showStatus('Loading…');
  try {
    const qs = new URLSearchParams({ period: state.period });
    if (state.user) qs.set('user', state.user);
    const resp = await fetch(`/api/events?${qs}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Request failed');

    renderKpis(data.kpis);
    renderMap(data.mapPoints);
    renderTimeline(data.timeline);
    renderBars('countries', data.byCountry.slice(0, 12), 'country', 'count');
    renderBars('topUsers', data.topUsers, 'user', 'count');
    renderTable(data.events);
    showStatus(`${data.kpis.totalEvents} events · ${data.cached ? 'cached' : 'live'}`);
  } catch (err) {
    showStatus('Error: ' + err.message);
  }
}

function wire() {
  document.getElementById('periodGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-period]');
    if (!btn) return;
    document.querySelectorAll('#periodGroup button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.period = btn.dataset.period;
    state.user = '';
    loadUsers().then(load);
  });
  document.getElementById('userSelect').addEventListener('change', (e) => {
    state.user = e.target.value;
    load();
  });
  document.getElementById('refreshBtn').addEventListener('click', () => loadUsers().then(load));
}

initMap();
wire();
loadUsers().then(load);
