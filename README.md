# Infor Login Events — Global Activity

A zero-dependency Node app that visualizes Infor **LOGIN/LOGOUT** events from
`AUDITMONITOR/monitoringreports/v3/logs`:

- Selectable time periods: 1h / 6h / 24h / 7d / 30d
- Per-user filter
- KPI cards: logins, distinct users, countries, avg/median session duration,
  MFA %, and office/private-IP logins
- World map (Leaflet + marker clustering) of login locations (geo is embedded in
  the monitoring payload — no external geolocation API is called)
- Timeline, top-countries, top-users charts, and a recent-events table

## Run locally

```powershell
$env:IONAPI_PATH = "..\KIRO.ionapi"   # path to the .ionapi credentials file
$env:PORT = "3000"
node server.js
# open http://localhost:3000
```

Credentials are supplied via **either**:
- `IONAPI_PATH` — path to a `.ionapi` file (local dev), or
- `IONAPI_JSON` — the full `.ionapi` JSON inline (used on Render as a secret).

Secrets are only ever read server-side; nothing is sent to the browser.

## Deploy to Render

Render's Node runtime deploys **from a Git repo** (confirmed by the API:
"repo is required when using runtime: node"). There is no file-upload path.

1. Put this folder in a Git repo (GitHub/GitLab/Bitbucket). The `.gitignore`
   here keeps `*.ionapi` and other secrets out of the commit.
2. In Render: **New > Blueprint** (uses `render.yaml`) or **New > Web Service**
   pointed at the repo. Runtime: Node. Build: none. Start: `node server.js`.
3. In the service's **Environment** tab, add a secret env var:
   - `IONAPI_JSON` = the entire contents of your `.ionapi` file on one line.
4. Deploy. The free plan is sufficient; the app has no persistent storage needs.

## Notes

- The monitoring API returns at most 10,000 results; the backend paginates up to
  that cap (10 pages × 1000).
- Server-side response cache (60s TTL per period) keeps the UI snappy and reduces
  load on the tenant.
