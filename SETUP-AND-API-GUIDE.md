# Infor Login Events Visualizer — Setup & API Guide (shareable)

A tenant-agnostic guide to run the **login-visualizer** dashboard against *your own*
Infor OS tenant. Nothing here is specific to one tenant — everything tenant-specific
comes from your own `.ionapi` credentials file.

The app shows LOGIN/LOGOUT events on a world map with KPIs (incl. session duration),
per-user and time-period filters, localization, and themes. All geolocation data is
**embedded in the Infor monitoring API response** — no external geolocation service
is required.

---

## 1. Prerequisites

- An Infor OS (Cloud) tenant with the **Audit & Monitoring** API suite available in
  API Gateway, and permission to read monitoring logs.
- A registered **backend (service account) app** in API Gateway → download its
  `.ionapi` credentials file. This uses the resource-owner/password grant
  (SAAK/SASK). Role needed: an account allowed to read tenant monitoring logs
  (typically a security/admin-level service account).
- Node.js **>= 18** (for global `fetch`).
- (To deploy) A Render account and a Git repo host (e.g. GitHub).

> Treat the `.ionapi` as a secret. It contains `cs`, `saak`, `sask`. Never commit it.

---

## 2. The API contract this app depends on

All requests go through the API Gateway base URL. **The gateway base URL (`iu` in
the `.ionapi`) does NOT include the tenant segment**, so every path must be prefixed
with your tenant id (`ti` in the `.ionapi`):

```
{iu}/{ti}/AUDITMONITOR/monitoringreports/v3/logs
```

### Auth (resource-owner / password grant)
- Token URL = `{pu}` + `/` + `{ot}` (join with exactly one slash; `pu` often ends in
  `/as/` and `ot` is `token.oauth2` → `.../as/token.oauth2`).
- Body (`application/x-www-form-urlencoded`): `client_id={ci}`, `client_secret={cs}`,
  `grant_type=password`, `username={saak}`, `password={sask}`.
- Use the returned `access_token` as `Authorization: Bearer <token>`.

### Monitoring logs call
- **Method**: `POST`
- **Path**: `{iu}/{ti}/AUDITMONITOR/monitoringreports/v3/logs`
- **Required header**: `x-monitoring-source: sts`
- **Body**:
  ```json
  {
    "fetchsize": 1000,
    "page": 1,
    "sortorder": "logTime DESC",
    "query": "logTime BETWEEN \"2026-10-19T00:00:00+00:00\" TO \"2026-10-23T23:59:00+00:00\" AND action IN [\"LOGIN\",\"LOGOUT\"]",
    "timezone-offset": "00"
  }
  ```
- **Result cap**: the API returns at most **10,000** results. Paginate with
  `page` 1..10 at `fetchsize` 1000; stop at 10k.
- For relative windows (last 1h/24h/7d/30d), compute the `from`/`to` ISO-8601
  timestamps (with offset) at request time.

### Response record shape (fields the app uses)
```
severity
action                 LOGIN | LOGOUT
outcome                SUCCESS | ...
logTime                ISO-8601 (Z)
principal { fullName, userName, userId }
logicalId, tenantId
sessionContext { ssoSessionId, sessionDuration (seconds, present on LOGOUT),
                 startTimestamp, endTimestamp, signedOutFromIdp }
authContext   { sourceId, source, mfa { enabled } }
connection    { geoLocation { country (2-letter ISO code), city (may be
                               URL-encoded, decode it), timezone,
                               latitude, longitude },
                ipAddresses, userAgent }
```
Notes:
- `country` is a 2-letter ISO code only (no full name). Convert client-side with
  `Intl.DisplayNames` — no mapping table needed.
- `city` may be URL-encoded (e.g. `D%C3%BCsseldorf`) — URL-decode before display.
- Geo is in the payload; **no external geolocation API** is needed.

---

## 3. Run locally

```bash
# point at your own .ionapi file
# PowerShell:
$env:IONAPI_PATH = "C:\path\to\YOUR-TENANT.ionapi"
$env:PORT = "3000"
node server.js
# open http://localhost:3000
```

Credentials are read from **either**:
- `IONAPI_PATH` — path to a `.ionapi` file (local dev), or
- `IONAPI_JSON` — the full `.ionapi` contents as inline one-line JSON (used on Render).

Secrets are only ever read server-side; nothing is sent to the browser.

---

## 4. Deploy to Render (works with any tenant)

Render's Node runtime deploys **from a Git repo** (there is no file-upload path).

1. Push this folder to a Git repo. The included `.gitignore` keeps `*.ionapi` and
   other secrets out of commits.
2. Create the service (either option):
   - **Dashboard**: New → Web Service → connect the repo. Runtime **Node**,
     Build command `echo no build step`, Start command `node server.js`.
   - **API** (public repo, no GitHub OAuth needed):
     ```
     POST https://api.render.com/v1/services
     Authorization: Bearer <RENDER_API_KEY>
     { "type":"web_service", "name":"infor-login-visualizer",
       "ownerId":"<your owner id>", "repo":"<public repo url>", "branch":"main",
       "serviceDetails":{ "env":"node", "plan":"free",
         "envSpecificDetails":{ "buildCommand":"echo no build step",
                                "startCommand":"node server.js" } } }
     ```
3. Set a **secret env var** `IONAPI_JSON` = the full contents of *your* `.ionapi`,
   minified to one line. (Dashboard → Environment tab.)
4. Deploy.

### Gotcha (important)
Setting env vars via the Render **API** does NOT trigger a redeploy; the running
instance keeps the old environment and the app will report
"Set IONAPI_PATH or IONAPI_JSON". Fix: trigger a deploy
(`POST /v1/services/<id>/deploys`) or edit the var in the **dashboard** (which
redeploys automatically).

---

## 5. Targeting a different tenant later

- **Local**: change `IONAPI_PATH` to the other tenant's `.ionapi`, restart.
- **Render**: replace the `IONAPI_JSON` value with the other tenant's `.ionapi`
  (one line) in the dashboard; it redeploys and now serves that tenant.

Everything tenant-specific (tenant id, gateway/token URLs, keys) lives inside the
`.ionapi`, so swapping the file/var fully switches tenants. No code changes.

---

## 6. Security notes

- HTTPS only (Render provides it). The `.ionapi` lives server-side; it is never
  returned to the browser.
- This app has **no user authentication** of its own — anyone with the URL sees the
  configured tenant's data. Keep the URL private, or put an auth layer in front
  before exposing sensitive tenants.
- The app uses a single service-account credential, so it sees whatever that account
  is permitted to see tenant-wide. If you need per-user access control, that requires
  an OIDC/authorization-code redesign (out of scope for this build).
- Rotate any API key or credential that is ever exposed (e.g. pasted into chat/email).
