// app.js — frontend logic: fetch data, render KPIs / map / charts / table (localized).

import { i18n } from './i18n.js';

const state = {
  period: '24h',
  user: '',
  allEvents: [],          // raw events for current fetch (for table filter/sort)
  sortKey: 'logTime',
  sortDir: 'desc',
  search: '',
  actionFilter: '',       // '', 'LOGIN', 'LOGOUT'
};

const THEMES = ['dark', 'light', 'ocean', 'contrast'];

function applyTheme(theme) {
  const t = THEMES.includes(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
}

function buildThemeSelect() {
  const sel = document.getElementById('themeSelect');
  const labelKey = { dark: 'themeDark', light: 'themeLight', ocean: 'themeOcean', contrast: 'themeContrast' };
  sel.innerHTML = THEMES.map((t) => `<option value="${t}">${i18n.t(labelKey[t])}</option>`).join('');
  sel.value = localStorage.getItem('theme') || 'dark';
}

let map, markerLayer;

function initMap() {
  map = L.map('map', { worldCopyJump: true }).setView([20, 10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; OpenStreetMap contributors',
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

// --- Apply static UI strings + document locale/direction ---
function applyStaticStrings() {
  document.documentElement.lang = i18n.uiLang;
  document.documentElement.dir = i18n.dir;
  document.title = i18n.t('appTitle');
  const set = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = i18n.t(key); };
  set('appTitle', 'appTitle');
  set('lblUser', 'user'); set('lblLang', 'language'); set('lblTheme', 'theme');
  set('mapTitle', 'mapTitle'); set('timelineTitle', 'timelineTitle');
  set('countriesTitle', 'countriesTitle'); set('usersTitle', 'usersTitle');
  set('recentTitle', 'recentTitle');
  document.getElementById('refreshBtn').title = i18n.t('refresh');
  document.getElementById('tableSearch').placeholder = i18n.t('search');

  // "All users" option label
  const uSel = document.getElementById('userSelect');
  if (uSel.options[0]) uSel.options[0].textContent = i18n.t('allUsers');

  // action filter options
  const af = document.getElementById('actionFilter');
  af.innerHTML =
    `<option value="">${i18n.t('actionAll')}</option>` +
    `<option value="LOGIN">${i18n.t('login')}</option>` +
    `<option value="LOGOUT">${i18n.t('logout')}</option>`;
  af.value = state.actionFilter;

  // table headers
  const heads = { logTime: 'colTime', action: 'colAction', userName: 'colUser', city: 'colCity',
    country: 'colCountry', ip: 'colIp', sessionDuration: 'colSession', mfaEnabled: 'colMfa' };
  document.querySelectorAll('#eventsTable th.sortable').forEach((th) => {
    const key = th.dataset.sort;
    th.childNodes[0].nodeValue = i18n.t(heads[key]) + ' ';
  });
}

function renderKpis(k) {
  const cards = [
    { label: i18n.t('kpiLogins'), value: i18n.num(k.logins), cls: 'accent', sub: `${i18n.num(k.logouts)} ${i18n.t('kpiLogouts')}` },
    { label: i18n.t('kpiUsers'), value: i18n.num(k.distinctUsers), cls: '' },
    { label: i18n.t('kpiCountries'), value: i18n.num(k.distinctCountries), cls: 'green' },
    { label: i18n.t('kpiAvgSession'), value: i18n.duration(k.avgSessionSec), cls: '', sub: `${i18n.t('kpiMedian')} ${i18n.duration(k.medianSessionSec)}` },
    { label: i18n.t('kpiMfa'), value: `${i18n.num(k.mfaPct)}%`, cls: 'green', sub: `${i18n.num(k.mfaLogins)} ${i18n.t('kpiMfaOf')} ${i18n.num(k.logins)}` },
    { label: i18n.t('kpiPrivate'), value: i18n.num(k.privateIpLogins), cls: 'warn', sub: i18n.t('kpiPrivateSub') },
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
  const maxCount = Math.max(1, ...points.map((p) => p.count));
  for (const p of points) {
    const r = 6 + 14 * (p.count / maxCount);
    const m = L.circleMarker([p.lat, p.lon], {
      radius: r, color: '#4f9cff', weight: 1.5, fillColor: '#38d39f', fillOpacity: 0.65,
    });
    m.bindPopup(
      `<b>${p.city || '—'}, ${i18n.countryName(p.country)}</b><br>` +
      `${i18n.num(p.count)} ${i18n.t('logins')}<br>` +
      `${i18n.num(p.users)} ${p.users === 1 ? i18n.t('user') : i18n.t('kpiUsers')}`
    );
    markerLayer.addLayer(m);
  }
  const n = points.length;
  document.getElementById('mapMeta').textContent =
    `${i18n.num(n)} ${n === 1 ? i18n.t('location') : i18n.t('locations')}`;
}

function renderBars(elId, rows, labelFn, valKey) {
  const el = document.getElementById(elId);
  if (!rows.length) { el.innerHTML = `<div class="meta">${i18n.t('noData')}</div>`; return; }
  const max = Math.max(...rows.map((r) => r[valKey]));
  el.innerHTML = rows.map((r) => {
    const label = labelFn(r);
    return `
    <div class="bar-row">
      <div class="name" title="${label}">${label}</div>
      <div class="track"><div class="fill" style="width:${(r[valKey] / max) * 100}%"></div></div>
      <div class="n">${i18n.num(r[valKey])}</div>
    </div>`;
  }).join('');
}

// Timeline with a time axis (localized labels)
function renderTimeline(timeline) {
  const el = document.getElementById('timeline');
  const axis = document.getElementById('timelineAxis');
  if (!timeline.length) { el.innerHTML = `<div class="meta">${i18n.t('noData')}</div>`; axis.innerHTML = ''; return; }
  const max = Math.max(...timeline.map((t) => t.count));
  // hour buckets look like "yyyy-MM-ddTHH"; make a Date from each
  const toDate = (h) => new Date(h + ':00:00Z');
  el.innerHTML = timeline.map((t) => {
    const label = i18n.dayHourLabel(toDate(t.hour));
    return `<div class="spark" style="height:${(t.count / max) * 100}%" title="${label} — ${i18n.num(t.count)} ${i18n.t('logins')}"></div>`;
  }).join('');

  // Axis: show up to ~6 evenly spaced tick labels
  const ticks = 6;
  const step = Math.max(1, Math.ceil(timeline.length / ticks));
  const labels = [];
  for (let i = 0; i < timeline.length; i += step) {
    labels.push(i18n.dayHourLabel(toDate(timeline[i].hour)));
  }
  axis.innerHTML = labels.map((l) => `<span>${l}</span>`).join('');
}

// --- Recent events: filter + sort + render ---
function getFilteredSorted() {
  const q = state.search.trim().toLowerCase();
  let rows = state.allEvents.filter((e) => {
    if (state.actionFilter && e.action !== state.actionFilter) return false;
    if (!q) return true;
    return (
      (e.userName || '').toLowerCase().includes(q) ||
      (e.fullName || '').toLowerCase().includes(q) ||
      (e.city || '').toLowerCase().includes(q) ||
      i18n.countryName(e.country).toLowerCase().includes(q) ||
      (e.country || '').toLowerCase().includes(q) ||
      (e.ip || '').toLowerCase().includes(q)
    );
  });
  const key = state.sortKey, dir = state.sortDir === 'asc' ? 1 : -1;
  rows = rows.slice().sort((a, b) => {
    let av = a[key], bv = b[key];
    if (key === 'sessionDuration') { av = av || 0; bv = bv || 0; return (av - bv) * dir; }
    if (key === 'mfaEnabled') { return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir; }
    av = (av ?? '').toString().toLowerCase();
    bv = (bv ?? '').toString().toLowerCase();
    return av < bv ? -dir : av > bv ? dir : 0;
  });
  return rows;
}

function renderTable() {
  const rows = getFilteredSorted();
  const tbody = document.querySelector('#eventsTable tbody');
  tbody.innerHTML = rows.map((e) => `
    <tr>
      <td>${i18n.dateTime(e.logTime)}</td>
      <td><span class="pill ${e.action}">${i18n.t(e.action === 'LOGIN' ? 'login' : 'logout')}</span></td>
      <td title="${e.fullName}">${e.userName}</td>
      <td>${e.city || ''}</td>
      <td>${i18n.countryName(e.country)}</td>
      <td>${e.ip || ''}${e.isPrivate ? ` <span class="pill priv">priv</span>` : ''}</td>
      <td>${i18n.duration(e.sessionDuration)}</td>
      <td>${e.mfaEnabled ? '✓' : ''}</td>
    </tr>`).join('');
  document.getElementById('tableMeta').textContent = `${i18n.num(rows.length)} ${i18n.t('shown')}`;

  // sort arrows
  document.querySelectorAll('#eventsTable th.sortable').forEach((th) => {
    const arrow = th.querySelector('.arrow');
    arrow.textContent = th.dataset.sort === state.sortKey ? (state.sortDir === 'asc' ? '▲' : '▼') : '';
  });
}

function renderCountries(byCountry) {
  renderBars('countries', byCountry.slice(0, 12),
    (r) => i18n.countryName(r.country), 'count');
}
function renderUsers(topUsers) {
  renderBars('topUsers', topUsers, (r) => r.user, 'count');
}

async function loadUsers() {
  const resp = await fetch(`/api/users?period=${state.period}`);
  const data = await resp.json();
  const sel = document.getElementById('userSelect');
  const current = state.user;
  sel.innerHTML = `<option value="">${i18n.t('allUsers')}</option>` +
    (data.users || []).map((u) =>
      `<option value="${u.userName}">${u.userName}${u.fullName ? ' — ' + u.fullName : ''}</option>`
    ).join('');
  sel.value = current;
}

async function load() {
  showStatus(i18n.t('loading'));
  try {
    const qs = new URLSearchParams({ period: state.period });
    if (state.user) qs.set('user', state.user);
    const resp = await fetch(`/api/events?${qs}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Request failed');

    state.allEvents = data.events || [];
    renderKpis(data.kpis);
    renderMap(data.mapPoints);
    renderTimeline(data.timeline);
    renderCountries(data.byCountry);
    renderUsers(data.topUsers);
    renderTable();
    showStatus(`${i18n.num(data.kpis.totalEvents)} ${i18n.t('events')} · ${data.cached ? i18n.t('eventsCached') : i18n.t('eventsLive')}`);
  } catch (err) {
    showStatus(`${i18n.t('error')}: ${err.message}`);
  }
}

function buildLangSelect() {
  const sel = document.getElementById('langSelect');
  const names = new Intl.DisplayNames([i18n.fullLocale], { type: 'language' });
  sel.innerHTML = i18n.availableLangs.map((l) => {
    let label = l.toUpperCase();
    try { label = names.of(l) || label; } catch { /* keep */ }
    return `<option value="${l}">${label}</option>`;
  }).join('');
  sel.value = i18n.uiLang;
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
    state.user = e.target.value; load();
  });
  document.getElementById('refreshBtn').addEventListener('click', () => loadUsers().then(load));

  document.getElementById('langSelect').addEventListener('change', (e) => {
    i18n.setLang(e.target.value);
    applyStaticStrings();
    buildLangSelect();
    buildThemeSelect();
    // re-render everything in the new locale from current data
    load();
  });

  document.getElementById('themeSelect').addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // table controls
  let searchT;
  document.getElementById('tableSearch').addEventListener('input', (e) => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { state.search = e.target.value; renderTable(); }, 150);
  });
  document.getElementById('actionFilter').addEventListener('change', (e) => {
    state.actionFilter = e.target.value; renderTable();
  });
  document.querySelectorAll('#eventsTable th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = key === 'logTime' || key === 'sessionDuration' ? 'desc' : 'asc';
      }
      renderTable();
    });
  });
}

initMap();
applyTheme(localStorage.getItem('theme') || 'dark');
applyStaticStrings();
buildLangSelect();
buildThemeSelect();
wire();
loadUsers().then(load);
