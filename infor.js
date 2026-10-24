// infor.js — Infor API Gateway client: OAuth token management + monitoring log queries.
// Secrets come from the .ionapi file (path via IONAPI_PATH) or an IONAPI_JSON env var.
// Nothing here is ever sent to the browser.

import fs from 'node:fs';

let credCache = null;
function loadCred() {
  if (credCache) return credCache;
  const inline = process.env.IONAPI_JSON;
  if (inline && inline.trim().startsWith('{')) {
    credCache = JSON.parse(inline);
    return credCache;
  }
  const path = process.env.IONAPI_PATH;
  if (!path) throw new Error('Set IONAPI_PATH (file) or IONAPI_JSON (inline JSON).');
  if (!fs.existsSync(path)) throw new Error(`ionapi file not found: ${path}`);
  credCache = JSON.parse(fs.readFileSync(path, 'utf8'));
  return credCache;
}

// --- OAuth token cache (password grant via SAAK/SASK) ---
let tokenCache = { token: null, expiresAt: 0 };

async function getToken() {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60_000) return tokenCache.token;

  const c = loadCred();
  const tokenUrl = c.pu.replace(/\/+$/, '') + '/' + c.ot.replace(/^\/+/, '');
  const form = new URLSearchParams({
    client_id: c.ci,
    client_secret: c.cs,
    grant_type: 'password',
    username: c.saak,
    password: c.sask,
  });
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!resp.ok) throw new Error(`Token request failed: HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error('No access_token in token response.');
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return tokenCache.token;
}

function gatewayBase() {
  const c = loadCred();
  return c.iu.replace(/\/+$/, '') + '/' + c.ti;
}

// --- Monitoring logs: LOGIN/LOGOUT events in a time window, with pagination ---
// fromISO / toISO are ISO-8601 strings with offset, e.g. 2026-10-17T00:00:00+00:00
const FETCH_SIZE = 1000;
// The monitoring API returns at most 10,000 results total, so cap pagination at 10 pages.
const MAX_PAGES = 10;

export async function fetchLoginEvents(fromISO, toISO) {
  const token = await getToken();
  const url = `${gatewayBase()}/AUDITMONITOR/monitoringreports/v3/logs`;
  const query =
    `logTime BETWEEN "${fromISO}" TO "${toISO}" AND action IN ["LOGIN","LOGOUT"]`;

  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = {
      fetchsize: FETCH_SIZE,
      page,
      sortorder: 'logTime DESC',
      query,
      'timezone-offset': '00',
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-monitoring-source': 'sts',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`monitoring logs HTTP ${resp.status}: ${txt.slice(0, 300)}`);
    }
    const data = await resp.json();
    const results = data.results ?? [];
    all.push(...results);
    const total = data.meta?.totalhits ?? all.length;
    if (all.length >= total || results.length < FETCH_SIZE) break;
  }
  return all;
}
