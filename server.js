// server.js — zero-dependency HTTP API + static frontend host (Node built-ins only).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLoginEvents } from './infor.js';
import { normalize, computeKpis, aggregate } from './transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- Period -> window (hours) ---
const PERIODS = { '1h': 1, '6h': 6, '24h': 24, '7d': 168, '30d': 720 };

function windowFor(period) {
  const hours = PERIODS[period] ?? 24;
  const now = new Date();
  const from = new Date(now.getTime() - hours * 3600_000);
  const fmt = (d) => d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
  return { fromISO: fmt(from), toISO: fmt(now) };
}

// --- Short-TTL response cache keyed by period (raw events; user filter applied after) ---
const CACHE_TTL_MS = 60_000;
const cache = new Map();

async function getEvents(period) {
  const hit = cache.get(period);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { events: hit.events, cached: true };
  const { fromISO, toISO } = windowFor(period);
  const raw = await fetchLoginEvents(fromISO, toISO);
  const events = normalize(raw);
  cache.set(period, { at: Date.now(), events });
  return { events, cached: false };
}

// --- helpers ---
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png',
};

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  // prevent path traversal
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

// --- API handlers ---
async function handleUsers(res, period) {
  const { events } = await getEvents(period);
  const users = [...new Map(
    events.filter((e) => e.userName).map((e) => [e.userName, e.fullName])
  ).entries()].map(([userName, fullName]) => ({ userName, fullName }))
    .sort((a, b) => a.userName.localeCompare(b.userName));
  sendJson(res, 200, { users });
}

async function handleEvents(res, period, user) {
  if (!PERIODS[period]) {
    return sendJson(res, 400, { error: `Invalid period. Use: ${Object.keys(PERIODS).join(', ')}` });
  }
  const { events, cached } = await getEvents(period);
  const filtered = user ? events.filter((e) => e.userName === user) : events;
  sendJson(res, 200, {
    period, user, cached,
    generatedAt: new Date().toISOString(),
    kpis: computeKpis(filtered),
    ...aggregate(filtered),
    events: filtered.slice().sort((a, b) => (a.logTime < b.logTime ? 1 : -1)).slice(0, 500),
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;
    if (p === '/api/health') return sendJson(res, 200, { ok: true });
    if (p === '/api/users') return await handleUsers(res, url.searchParams.get('period') || '24h');
    if (p === '/api/events') {
      return await handleEvents(res,
        url.searchParams.get('period') || '24h',
        url.searchParams.get('user') || null);
    }
    return serveStatic(req, res, p);
  } catch (err) {
    sendJson(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`login-visualizer listening on http://localhost:${PORT}`);
});
