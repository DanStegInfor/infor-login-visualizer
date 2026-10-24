// transform.js — normalize raw monitoring records and compute KPIs.

// Decode URL-encoded city names (e.g. "D%C3%BCsseldorf" -> "Düsseldorf").
function decode(s) {
  if (!s) return s;
  try { return decodeURIComponent(s); } catch { return s; }
}

// Is the IP a private / non-routable (office network) address?
export function isPrivateIp(ip) {
  if (!ip) return false;
  const first = ip.split(',')[0].trim();
  if (first === '0.0.0.0' || first === '::1') return true;
  const o = first.split('.');
  if (o.length !== 4) return false;
  const a = +o[0], b = +o[1];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export function normalize(raw) {
  return raw.map((e) => {
    const geo = e.connection?.geoLocation ?? {};
    const ip = (e.connection?.ipAddresses ?? '').split(',')[0].trim();
    const lat = parseFloat(geo.latitude);
    const lon = parseFloat(geo.longitude);
    return {
      uuid: e.uuid,
      action: e.action,                       // LOGIN | LOGOUT
      outcome: e.outcome,                      // SUCCESS | ...
      logTime: e.logTime,
      userName: e.principal?.userName ?? '',
      fullName: e.principal?.fullName ?? '',
      userId: e.principal?.userId ?? '',
      country: geo.country ?? '',
      city: decode(geo.city ?? ''),
      timezone: geo.timezone ?? '',
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      ip,
      isPrivate: isPrivateIp(ip),
      userAgent: e.connection?.userAgent ?? '',
      mfaEnabled: !!e.authContext?.mfa?.enabled,
      authSource: e.authContext?.source ?? '',
      sessionDuration: e.sessionContext?.sessionDuration ?? null, // seconds (on LOGOUT)
      sessionStart: e.sessionContext?.startTimestamp ?? null,
      sessionEnd: e.sessionContext?.endTimestamp ?? null,
      severity: e.severity ?? '',
    };
  });
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeKpis(events) {
  const logins = events.filter((e) => e.action === 'LOGIN');
  const logouts = events.filter((e) => e.action === 'LOGOUT');
  const users = new Set(events.map((e) => e.userName).filter(Boolean));
  const countries = new Set(events.map((e) => e.country).filter(Boolean));
  const privateLogins = logins.filter((e) => e.isPrivate);
  const mfaLogins = logins.filter((e) => e.mfaEnabled);
  const durations = logouts
    .map((e) => e.sessionDuration)
    .filter((d) => typeof d === 'number' && d > 0);

  return {
    totalEvents: events.length,
    logins: logins.length,
    logouts: logouts.length,
    distinctUsers: users.size,
    distinctCountries: countries.size,
    privateIpLogins: privateLogins.length,
    mfaLogins: mfaLogins.length,
    mfaPct: logins.length ? Math.round((mfaLogins.length / logins.length) * 100) : 0,
    avgSessionSec: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
    medianSessionSec: Math.round(median(durations)),
  };
}

// Aggregations for charts/map
export function aggregate(events) {
  const logins = events.filter((e) => e.action === 'LOGIN');

  const byCountry = {};
  const byUser = {};
  const mapPoints = {};
  const byHour = {};

  for (const e of logins) {
    if (e.country) byCountry[e.country] = (byCountry[e.country] || 0) + 1;
    if (e.userName) byUser[e.userName] = (byUser[e.userName] || 0) + 1;
    if (e.lat != null && e.lon != null) {
      const key = `${e.lat.toFixed(3)},${e.lon.toFixed(3)}`;
      if (!mapPoints[key]) {
        mapPoints[key] = { lat: e.lat, lon: e.lon, city: e.city, country: e.country, count: 0, users: new Set() };
      }
      mapPoints[key].count++;
      mapPoints[key].users.add(e.userName);
    }
    const hour = (e.logTime || '').slice(0, 13); // yyyy-MM-ddTHH
    if (hour) byHour[hour] = (byHour[hour] || 0) + 1;
  }

  return {
    byCountry: Object.entries(byCountry).map(([k, v]) => ({ country: k, count: v }))
      .sort((a, b) => b.count - a.count),
    topUsers: Object.entries(byUser).map(([k, v]) => ({ user: k, count: v }))
      .sort((a, b) => b.count - a.count).slice(0, 15),
    mapPoints: Object.values(mapPoints).map((p) => ({
      lat: p.lat, lon: p.lon, city: p.city, country: p.country,
      count: p.count, users: p.users.size,
    })),
    timeline: Object.entries(byHour).map(([k, v]) => ({ hour: k, count: v }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
  };
}
