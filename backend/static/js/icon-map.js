// =============================================================================
//  Central icon mapping — single source of truth for client-rendered icons.
//
//  The SAME keys resolve to the SAME icons on the frontend (here) and on the
//  backend (see backend/icon_map.py). Never hardcode an icon class or SVG path
//  directly in a JS file — always go through these maps / helpers.
//
//  Libraries (all self-hosted under /static/):
//    * Meteocons   -> /static/icons/meteocons/*.svg     (weather condition visuals)
//    * Tabler Icons webfont -> "ti ti-<name>"           (general UI / clothing / activities)
//    * flag-icons  -> /static/vendor/flag-icons         (language / country flags)
// =============================================================================

const METEO_BASE = "/static/icons/meteocons/";

// Weather condition icons (Meteocons). Keyed off the OWM `main condition` the
// backend already sends in `meteo.condition` / `previsions[].condition`.
export const WEATHER_ICON_SVG = {
  "Clear":        { day: "clear-day.svg",                 night: "clear-night.svg" },
  "Clouds":       { day: "partly-cloudy-day.svg",         night: "partly-cloudy-night.svg" },
  "Rain":         { day: "rain.svg",                      night: "rain.svg" },
  "Drizzle":      { day: "drizzle.svg",                   night: "drizzle.svg" },
  "Thunderstorm": { day: "thunderstorms-day.svg",         night: "thunderstorms-night.svg" },
  "Snow":         { day: "snow.svg",                      night: "snow.svg" },
  "Mist":         { day: "mist.svg",                      night: "mist.svg" },
  "Fog":          { day: "fog-day.svg",                   night: "fog-night.svg" },
  "Haze":         { day: "haze.svg",                      night: "haze.svg" },
  "Dust":         { day: "dust-day.svg",                  night: "dust-night.svg" },
  "Sand":         { day: "dust.svg",                      night: "dust.svg" },
  "Smoke":        { day: "smoke.svg",                      night: "smoke.svg" },
  "Ash":          { day: "dust.svg",                       night: "dust.svg" },
  "Squall":       { day: "wind.svg",                      night: "wind.svg" },
  "Tornado":      { day: "wind.svg",                      night: "wind.svg" },
};
const WEATHER_ICON_FALLBACK = "partly-cloudy-day.svg";

// Flat weather-condition -> SVG mapping (condition display key -> vector path).
// Coexists with WEATHER_ICON_SVG (which keys off the OWM `main condition` +
// is_day flag). Kept for code paths that resolve an icon by display name.
// NOTE: paths are relative (no leading slash). The existing helpers under
// ICON_BASE (WEATHER_ICON_SVG) remain authoritative for OWM-condition lookups.
export const WEATHER_ICON_MAP = {
  "clear-day":        "meteocons/clear-day.svg",
  "clear-night":      "meteocons/clear-night.svg",
  "partly-cloudy-day":"meteocons/partly-cloudy-day.svg",
  "cloudy":           "meteocons/cloudy.svg",
  "rain":             "meteocons/rain.svg",
  "drizzle":          "meteocons/drizzle.svg",
  "thunderstorm":     "meteocons/thunderstorms.svg",
  "snow":             "meteocons/snow.svg",
  "fog":              "meteocons/fog.svg",
  "wind":             "meteocons/wind.svg",
  "sunrise":          "meteocons/sunrise.svg",
  "sunset":           "meteocons/sunset.svg",
};

export const SUNRISE_ICON_SVG = "sunrise.svg";
export const SUNSET_ICON_SVG = "sunset.svg";

// General UI icons (Tabler Icons webfont).
export const UI_ICON_MAP = {
  "home":            "ti ti-home",
  "compare":         "ti ti-scale",
  "export":          "ti ti-file-export",
  "close":           "ti ti-x",
  "chevron-down":    "ti ti-chevron-down",
  "skip":            "ti ti-player-skip-forward",
  "check":           "ti ti-check",
  "check-circle":    "ti ti-circle-check",
  "cross-circle":    "ti ti-circle-x",
  "back":            "ti ti-arrow-left",
  "mic":             "ti ti-microphone",
  "camera":          "ti ti-camera",
  "location":        "ti ti-map-pin",
  "locate-me":       "ti ti-current-location",
  "theme-light":     "ti ti-sun",
  "theme-dark":      "ti ti-moon",
  "save":            "ti ti-device-floppy",
  "calendar":        "ti ti-calendar",
  "compass":         "ti ti-compass",
  "search":          "ti ti-search",
  "device":          "ti ti-device-mobile",
  "chart":           "ti ti-chart-line",
  "pressure":        "ti ti-gauge",
  "eye":             "ti ti-eye",
  "droplet":         "ti ti-droplet",
  "droplets":        "ti ti-droplets",
  "thermometer":     "ti ti-temperature",
  "feels-like":      "ti ti-temperature",
  "wind-meter":      "ti ti-wind",
  "cloud":           "ti ti-cloud",
  "map":             "ti ti-map",
  "sparkles":        "ti ti-sparkles",
  "bulb":            "ti ti-bulb-filled",
  "info":            "ti ti-info-circle",
  "alert":           "ti ti-alert-triangle",
  "ban":             "ti ti-ban",
  "bolt":            "ti ti-bolt",
  "flame":           "ti ti-flame",
  "ice":             "ti ti-temperature-minus",
  "snowflake":       "ti ti-snowflake",
  "umbrella":        "ti ti-umbrella",
  "sun":             "ti ti-sun",
  "windsock":        "ti ti-windsock",
  "rocket":          "ti ti-rocket",
  "clock":           "ti ti-clock",
  "printer":         "ti ti-printer",
  "schedule":        "ti ti-calendar-time",
  "world":           "ti ti-world",
  "globe":           "ti ti-globe",
  "target":          "ti ti-target",
  "heart":           "ti ti-heart",
  "heart-broken":    "ti ti-heart-broken",
  "star":            "ti ti-star",
  "user":            "ti ti-user",
  "user-check":      "ti ti-user-check",
  "wave":            "ti ti-door-enter",
  "tractor":         "ti ti-tractor",
  "construction":    "ti ti-building-factory",
  "briefcase":       "ti ti-briefcase",
  "logout":          "ti ti-door-exit",
  "ai":              "ti ti-robot",
  "stethoscope":     "ti ti-stethoscope",
  "health":          "ti ti-stethoscope",
  "shield":          "ti ti-shield-check",
  "mood-good":       "ti ti-mood-smile",
  "mood-ok":         "ti ti-mood-neutral",
  "mood-bad":        "ti ti-mood-sad",
  "mood-puzzled":    "ti ti-mood-puzzled",
};

// Clothing icons (Tabler).
export const CLOTHING_ICON_MAP = {
  "jacket":      "ti ti-jacket",
  "coat":        "ti ti-jacket",
  "scarf":       "ti ti-windsock",
  "gloves":      "ti ti-hand-stop",
  "boots":       "ti ti-shoe",
  "shoes":       "ti ti-shoe",
  "sneakers":    "ti ti-shoe",
  "pants":       "ti ti-hanger",
  "jeans":       "ti ti-hanger",
  "tshirt":      "ti ti-shirt",
  "sunglasses":  "ti ti-sunglasses",
  "shorts":      "ti ti-swimming",
  "sandals":     "ti ti-shoe",
  "sunscreen":   "ti ti-sun-high",
  "hat":         "ti ti-hanger",
  "tank":        "ti ti-shirt",
  "water":       "ti ti-droplet",
  "phone":       "ti ti-device-mobile",
  "backpack":    "ti ti-backpack",
  "umbrella":    "ti ti-umbrella",
};

// Activity icons (Tabler).
export const ACTIVITY_ICON_MAP = {
  "running":   "ti ti-run",
  "cycling":   "ti ti-bike",
  "swimming":  "ti ti-swimming",
  "walking":   "ti ti-walk",
  "picnic":    "ti ti-basket",
  "car":       "ti ti-car",
  "driving":   "ti ti-car",
  "beach":     "ti ti-beach",
  "photo":     "ti ti-camera",
  "cinema":    "ti ti-movie",
  "museum":    "ti ti-building-bank",
  "cafe":      "ti ti-coffee",
  "shopping":  "ti ti-shopping-bag",
  "library":   "ti ti-books",
  "games":     "ti ti-device-gamepad-2",
  "film":      "ti ti-movie",
  "read":      "ti ti-book-2",
  "ski":       "ti ti-snowboarding",
  "sledge":    "ti ti-snowman",
  "snowman":   "ti ti-snowman",
  "hot-cocoa": "ti ti-coffee",
  "default":   "ti ti-activity",
};

// Country / language flags (flag-icons).
export const FLAG_ICON_MAP = {
  "fr": "fi fi-fr",
  "gb": "fi fi-gb",
  "ml": "fi fi-ml",
  "sn": "fi fi-sn",
  "jp": "fi fi-jp",
  "us": "fi fi-us",
  "ae": "fi fi-ae",
};

// Air-quality level icons (Tabler). 1..5 (OWM AQI).
export const AQI_LEVEL_ICON_MAP = {
  1: "ti ti-mood-smile",
  2: "ti ti-mood-smile",
  3: "ti ti-mood-neutral",
  4: "ti ti-mood-sad",
  5: "ti ti-mood-angry",
};

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function _nowHHMM() {
  const d = new Date();
  return (d.getHours() < 10 ? "0" + d.getHours() : "" + d.getHours()) + ":" +
         (d.getMinutes() < 10 ? "0" + d.getMinutes() : "" + d.getMinutes());
}

export function isDay(sunrise, sunset) {
  try {
    if (sunrise && sunset) {
      const now = _nowHHMM();
      return sunrise <= now && now < sunset;
    }
  } catch (e) { /* ignore */ }
  return true;
}

// Filename for a given OWM condition (+ optional is_day flag).
export function weatherIconFile(condition, day) {
  const entry = WEATHER_ICON_SVG[condition] || {};
  return entry[day ? "day" : "night"] || entry.day || WEATHER_ICON_FALLBACK;
}

// <img> tag for a given OWM condition.
export function weatherIcon(condition, isDayFlag, opts = {}) {
  if (isDayFlag === undefined || isDayFlag === null) isDayFlag = true;
  const file = weatherIconFile(condition, isDayFlag);
  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : "";
  const cls = opts.class ? ` ${opts.class}` : " weather-icon-meteocon";
  return `<img class="${cls.trim()}" src="${METEO_BASE}${file}" alt="${condition || "weather"}" loading="lazy" draggable="false"${size}>`;
}

export function weatherIconPath(condition, day = true) {
  return METEO_BASE + weatherIconFile(condition, day);
}

// Kebab-case CSS class for animation scoping (e.g. "clear-day", "rain").
export function weatherIconCssClass(condition, isDay) {
  const map = {
    'Clear': isDay ? 'clear-day' : 'clear-night',
    'Clouds': isDay ? 'partly-cloudy-day' : 'partly-cloudy-night',
    'Rain': 'rain',
    'Drizzle': 'drizzle',
    'Thunderstorm': 'thunderstorm',
  };
  return map[condition] || (condition || '').toLowerCase() || 'cloudy';
}

export function uiIcon(key) {
  return `<i class="${UI_ICON_MAP[key] || "ti ti-help"}" aria-hidden="true"></i>`;
}

export function clothingIcon(key = "jacket") {
  return `<i class="${CLOTHING_ICON_MAP[key] || CLOTHING_ICON_MAP.jacket}" aria-hidden="true"></i>`;
}

export function activityIcon(key = "running") {
  return `<i class="${ACTIVITY_ICON_MAP[key] || ACTIVITY_ICON_MAP.running}" aria-hidden="true"></i>`;
}

export function flagIcon(code) {
  return `<span class="${FLAG_ICON_MAP[(code || "").toLowerCase()] || "fi fi-xx"}" aria-hidden="true"></span>`;
}

export function aqiIcon(level) {
  const cls = AQI_LEVEL_ICON_MAP[parseInt(level, 10) || 3] || "ti ti-mood-neutral";
  return `<i class="${cls}" aria-hidden="true"></i>`;
}

export function sunriseIcon() {
  return `<img class="weather-icon-meteocon" src="${METEO_BASE}${SUNRISE_ICON_SVG}" alt="sunrise" loading="lazy" draggable="false">`;
}

export function sunsetIcon() {
  return `<img class="weather-icon-meteocon" src="${METEO_BASE}${SUNSET_ICON_SVG}" alt="sunset" loading="lazy" draggable="false">`;
}

// Strip leading emoji / pictographs from a text string (used to clean LLM /
// rule-based recommendation strings before rendering them next to an icon).
const _EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}]/gu;
export function stripEmoji(s) {
  if (!s) return s;
  return String(s).replace(_EMOJI_RE, "").replace(/^\s+|[\s\u2022\u00b7]+$/g, "").trim();
}

// HTML-escape LLM output before injecting via innerHTML (defensive XSS hardening).
// Strip emojis first so emoji codepoints never appear in rendered LLM text.
export function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip emojis AND HTML-escape in one call — use this for any LLM-emitted text
// that ends up in `.innerHTML` (clothing/activity/pack/summary/advice items).
export function ses(s) {
  return escapeHtml(stripEmoji(s));
}

// Try to guess a clothing icon key from a free-text clothing item string.
const CLOTHING_KEYWORDS = [
  ["jacket", ["manteau", "veste", "imperm", "jacket", "coat", "coupe-vent"]],
  ["scarf",  ["echarpe", "écharpe", "foulard", "scarf"]],
  ["gloves", ["gant", "mitaine", "glove", "bonnet & gant", "gants"]],
  ["boots",  ["botte", "bottes", "boot", "antidérapant", "chaussures antid"]],
  ["sneakers",["basket", "sneaker", "baskets"]],
  ["pants", ["pantalon", "jean", "trouser"]],
  ["tshirt", ["t-shirt", "tshirt", "teeshirt", "débardeur", "tank", "shirt"]],
  ["sunglasses", ["lunette", "sunglasse"]],
  ["shorts", ["short", "shorts"]],
  ["sandals", ["sandale", "sandals"]],
  ["sunscreen", ["crème solaire", "spf", "sunscreen", "écran solaire"]],
  ["hat", ["chapeau", "casquette", "hat"]],
  ["umbrella", ["parapluie", "umbrella"]],
  ["backpack", ["sac", "backpack", "sac à dos"]],
  ["water", ["bouteille", "water", "eau"]],
  ["phone", ["téléphone", "phone", "chargé"]],
];

export function guessClothingIcon(item) {
  const s = String(item || "").toLowerCase();
  for (const [key, words] of CLOTHING_KEYWORDS) {
    if (words.some(w => s.includes(w))) return clothingIcon(key);
  }
  return clothingIcon("jacket");
}

// Try to guess an activity icon key from a free-text activity string.
const ACTIVITY_KEYWORDS = [
  ["running", ["course", "jogging", "running", "run", "footing"]],
  ["cycling", ["vélo", "velo", "cycling", "bike"]],
  ["swimming", ["natation", "swimming", "swim", "piscine"]],
  ["walking", ["randonnée", "randonnee", "promenade", "walking", "walk", "marche"]],
  ["picnic", ["pique-nique", "pique nique", "picnic"]],
  ["driving", ["conduite", "route", "driving", "car", "trajet", "road"]],
  ["beach", ["plage", "beach"]],
  ["photo", ["photo", "photographie"]],
  ["cinema", ["cinéma", "cinema", "film"]],
  ["museum", ["musée", "musee", "museum"]],
  ["cafe", ["café", "cafe", "terrasse"]],
  ["shopping", ["shopping", "courses", "boutique"]],
  ["library", ["bibliothèque", "bibliotheque", "library", "lecture"]],
  ["games", ["jeu", "jeux", "game", "games", "vidéo"]],
  ["read", ["lire", "lecture", "read"]],
  ["ski", ["ski", "snowboard"]],
  ["sledge", ["luge"]],
  ["snowman", ["bonhomme de neige", "snowman"]],
  ["hot-cocoa", ["chocolat chaud", "chocolate"]],
];

export function guessActivityIcon(item) {
  const s = String(item || "").toLowerCase();
  for (const [key, words] of ACTIVITY_KEYWORDS) {
    if (words.some(w => s.includes(w))) return activityIcon(key);
  }
  return activityIcon("default");
}