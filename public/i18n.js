// i18n.js — locale-aware UI strings + Intl-based formatting (countries, dates, numbers).
// Data artifacts (country names, dates, numbers) localize for ALL locales via Intl.
// Static UI strings are translated for the languages in DICT; anything else falls back to English.

const DICT = {
  en: {
    appTitle: 'Login Events — Global Activity',
    period: 'Period', user: 'User', allUsers: 'All users', refresh: 'Refresh',
    language: 'Language', theme: 'Theme',
    themeDark: 'Dark', themeLight: 'Light', themeOcean: 'Ocean', themeContrast: 'High contrast',
    kpiLogins: 'Logins', kpiLogouts: 'logouts',
    kpiUsers: 'Distinct users', kpiCountries: 'Countries',
    kpiAvgSession: 'Avg session', kpiMedian: 'median',
    kpiMfa: 'MFA logins', kpiMfaOf: 'of',
    kpiPrivate: 'Office / private IP', kpiPrivateSub: 'internal network',
    mapTitle: 'Login locations', timelineTitle: 'Logins over time',
    countriesTitle: 'Top countries', usersTitle: 'Top users',
    recentTitle: 'Recent events',
    colTime: 'Time', colAction: 'Action', colUser: 'User', colCity: 'City',
    colCountry: 'Country', colIp: 'IP', colSession: 'Session', colMfa: 'MFA',
    login: 'LOGIN', logout: 'LOGOUT',
    search: 'Search user, city, country…', actionAll: 'All actions',
    shown: 'shown', noData: 'No data',
    locations: 'locations', location: 'location',
    logins: 'logins', eventsLive: 'live', eventsCached: 'cached', events: 'events',
    loading: 'Loading…', error: 'Error',
  },
  es: {
    appTitle: 'Eventos de inicio de sesión — Actividad global',
    period: 'Período', user: 'Usuario', allUsers: 'Todos los usuarios', refresh: 'Actualizar',
    language: 'Idioma', theme: 'Tema',
    themeDark: 'Oscuro', themeLight: 'Claro', themeOcean: 'Oc�ano', themeContrast: 'Alto contraste',
    kpiLogins: 'Inicios de sesión', kpiLogouts: 'cierres',
    kpiUsers: 'Usuarios distintos', kpiCountries: 'Países',
    kpiAvgSession: 'Sesión media', kpiMedian: 'mediana',
    kpiMfa: 'Inicios con MFA', kpiMfaOf: 'de',
    kpiPrivate: 'IP de oficina / privada', kpiPrivateSub: 'red interna',
    mapTitle: 'Ubicaciones de inicio de sesión', timelineTitle: 'Inicios de sesión a lo largo del tiempo',
    countriesTitle: 'Países principales', usersTitle: 'Usuarios principales',
    recentTitle: 'Eventos recientes',
    colTime: 'Hora', colAction: 'Acción', colUser: 'Usuario', colCity: 'Ciudad',
    colCountry: 'País', colIp: 'IP', colSession: 'Sesión', colMfa: 'MFA',
    login: 'INICIO', logout: 'CIERRE',
    search: 'Buscar usuario, ciudad, país…', actionAll: 'Todas las acciones',
    shown: 'mostrados', noData: 'Sin datos',
    locations: 'ubicaciones', location: 'ubicación',
    logins: 'inicios', eventsLive: 'en vivo', eventsCached: 'en caché', events: 'eventos',
    loading: 'Cargando…', error: 'Error',
  },
  fr: {
    appTitle: 'Événements de connexion — Activité mondiale',
    period: 'Période', user: 'Utilisateur', allUsers: 'Tous les utilisateurs', refresh: 'Actualiser',
    language: 'Langue', theme: 'Th�me',
    themeDark: 'Sombre', themeLight: 'Clair', themeOcean: 'Oc�an', themeContrast: 'Contraste �lev�',
    kpiLogins: 'Connexions', kpiLogouts: 'déconnexions',
    kpiUsers: 'Utilisateurs distincts', kpiCountries: 'Pays',
    kpiAvgSession: 'Session moyenne', kpiMedian: 'médiane',
    kpiMfa: 'Connexions MFA', kpiMfaOf: 'sur',
    kpiPrivate: 'IP bureau / privée', kpiPrivateSub: 'réseau interne',
    mapTitle: 'Lieux de connexion', timelineTitle: 'Connexions dans le temps',
    countriesTitle: 'Principaux pays', usersTitle: 'Principaux utilisateurs',
    recentTitle: 'Événements récents',
    colTime: 'Heure', colAction: 'Action', colUser: 'Utilisateur', colCity: 'Ville',
    colCountry: 'Pays', colIp: 'IP', colSession: 'Session', colMfa: 'MFA',
    login: 'CONNEXION', logout: 'DÉCONNEXION',
    search: 'Rechercher utilisateur, ville, pays…', actionAll: 'Toutes les actions',
    shown: 'affichés', noData: 'Aucune donnée',
    locations: 'lieux', location: 'lieu',
    logins: 'connexions', eventsLive: 'en direct', eventsCached: 'en cache', events: 'événements',
    loading: 'Chargement…', error: 'Erreur',
  },
  de: {
    appTitle: 'Anmeldeereignisse — Globale Aktivität',
    period: 'Zeitraum', user: 'Benutzer', allUsers: 'Alle Benutzer', refresh: 'Aktualisieren',
    language: 'Sprache', theme: 'Design',
    themeDark: 'Dunkel', themeLight: 'Hell', themeOcean: 'Ozean', themeContrast: 'Hoher Kontrast',
    kpiLogins: 'Anmeldungen', kpiLogouts: 'Abmeldungen',
    kpiUsers: 'Eindeutige Benutzer', kpiCountries: 'Länder',
    kpiAvgSession: 'Ø Sitzung', kpiMedian: 'Median',
    kpiMfa: 'MFA-Anmeldungen', kpiMfaOf: 'von',
    kpiPrivate: 'Büro- / private IP', kpiPrivateSub: 'internes Netzwerk',
    mapTitle: 'Anmeldeorte', timelineTitle: 'Anmeldungen im Zeitverlauf',
    countriesTitle: 'Top-Länder', usersTitle: 'Top-Benutzer',
    recentTitle: 'Letzte Ereignisse',
    colTime: 'Zeit', colAction: 'Aktion', colUser: 'Benutzer', colCity: 'Stadt',
    colCountry: 'Land', colIp: 'IP', colSession: 'Sitzung', colMfa: 'MFA',
    login: 'ANMELDUNG', logout: 'ABMELDUNG',
    search: 'Benutzer, Stadt, Land suchen…', actionAll: 'Alle Aktionen',
    shown: 'angezeigt', noData: 'Keine Daten',
    locations: 'Orte', location: 'Ort',
    logins: 'Anmeldungen', eventsLive: 'live', eventsCached: 'zwischengespeichert', events: 'Ereignisse',
    loading: 'Laden…', error: 'Fehler',
  },
};

// --- locale resolution: ?lang= override -> localStorage -> navigator -> 'en' ---
function pickLocale() {
  const url = new URLSearchParams(location.search).get('lang');
  const saved = localStorage.getItem('lang');
  const candidates = [url, saved, ...(navigator.languages || [navigator.language || 'en'])];
  for (const c of candidates) {
    if (!c) continue;
    const base = c.toLowerCase().split('-')[0];
    if (DICT[base]) return { ui: base, full: c };
  }
  return { ui: 'en', full: navigator.language || 'en' };
}

let LOCALE = pickLocale();

// Country-code -> localized full name (built-in; no maintained mapping)
let countryNames;
try { countryNames = new Intl.DisplayNames([LOCALE.full], { type: 'region' }); }
catch { countryNames = null; }

export const i18n = {
  get uiLang() { return LOCALE.ui; },
  get fullLocale() { return LOCALE.full; },
  availableLangs: Object.keys(DICT),

  setLang(lang) {
    localStorage.setItem('lang', lang);
    LOCALE = pickLocale();
    try { countryNames = new Intl.DisplayNames([LOCALE.full], { type: 'region' }); }
    catch { countryNames = null; }
  },

  t(key) {
    return (DICT[LOCALE.ui] && DICT[LOCALE.ui][key]) || DICT.en[key] || key;
  },

  countryName(code) {
    if (!code) return '';
    if (countryNames) {
      try { return countryNames.of(code.toUpperCase()) || code; } catch { return code; }
    }
    return code;
  },

  num(n) {
    try { return new Intl.NumberFormat(LOCALE.full).format(n); } catch { return String(n); }
  },

  dateTime(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat(LOCALE.full, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso));
    } catch { return iso; }
  },

  hourLabel(iso) {
    try {
      return new Intl.DateTimeFormat(LOCALE.full, { hour: '2-digit', minute: '2-digit' })
        .format(new Date(iso));
    } catch { return iso; }
  },

  dayHourLabel(iso) {
    try {
      return new Intl.DateTimeFormat(LOCALE.full, { month: 'short', day: '2-digit', hour: '2-digit' })
        .format(new Date(iso));
    } catch { return iso; }
  },

  duration(sec) {
    if (!sec || sec <= 0) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    // Compact, locale-neutral units with localized numbers
    if (h > 0) return `${this.num(h)}h ${this.num(m)}m`;
    return m > 0 ? `${this.num(m)}m ${this.num(s)}s` : `${this.num(s)}s`;
  },

  // RTL detection for layout direction
  get dir() {
    const rtl = ['ar', 'he', 'fa', 'ur'];
    return rtl.includes(LOCALE.ui) ? 'rtl' : 'ltr';
  },
};
