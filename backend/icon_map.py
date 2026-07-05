"""
Central icon mapping — single source of truth for server-rendered (Jinja) icons.

The SAME keys resolve to the SAME icons on the backend (here) and on the
frontend (see backend/static/js/icon-map.js). Never hardcode an icon class or
SVG path directly in a template or JS file — always go through this map.

Libraries (all self-hosted under backend/static/):
  * Meteocons  -> static/icons/meteocons/*.svg   (weather condition visuals)
  * Tabler Icons (webfont) -> ti ti-<name>       (general UI / clothing / activities)
  * flag-icons -> static/vendor/flag-icons       (language / country flags)
"""

import datetime as _dt
import os as _os
import re as _re
from functools import lru_cache
from markupsafe import Markup

# Matches the emoji/pictograph codepoint ranges used across the app, so the same
# helper strips them on the backend (Jinja filter) and frontend (icon-map.js).
_EMOJI_RE = _re.compile(
    r"[\U0001F000-\U0001FAFF\u2600-\u27BF\U0001F1E6-\U0001F1FF"
    r"\u2190-\u21FF\u2B00-\u2BFF\u2300-\u23FF\uFE0F]+"
)


def strip_emoji(text):
    """Remove emoji / pictographs from a string (used to clean AI/rule text)."""
    if text is None:
        return ""
    out = _EMOJI_RE.sub("", str(text))
    # tidy leftover bullet/space edges
    return out.strip(" \u2022\u00b7\u00a0").strip()


def escape_html(text):
    """Minimal HTML-escape of <, >, &, \", ' for safe innerHTML injection.

    Use together with strip_emoji on any LLM-emitted text. Mirrors the
    `escapeHtml` / `ses` helpers in static/js/icon-map.js.
    """
    if text is None:
        return ""
    return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#39;"))


def strip_emoji_and_escape(text):
    """Strip emojis then HTML-escape — use this for any LLM-emitted text."""
    return escape_html(strip_emoji(text))


# ---------------- Weather condition icons (Meteocons SVG set) ----------------
# Keyed off the OpenWeatherMap `main condition` string the backend already sends
# (meteo.condition, previsions[].condition, ...). Day/night variants are chosen
# from the is_day flag, so the icon is always mathematically tied to the data.
WEATHER_ICON_SVG = {
    "Clear":       {"day": "clear-day.svg",                 "night": "clear-night.svg"},
    "Clouds":      {"day": "partly-cloudy-day.svg",         "night": "partly-cloudy-night.svg"},
    "Rain":        {"day": "rain.svg",                      "night": "rain.svg"},
    "Drizzle":     {"day": "drizzle.svg",                   "night": "drizzle.svg"},
    "Thunderstorm":{"day": "thunderstorms-day.svg",         "night": "thunderstorms-night.svg"},
    "Snow":        {"day": "snow.svg",                      "night": "snow.svg"},
    "Mist":        {"day": "mist.svg",                      "night": "mist.svg"},
    "Fog":         {"day": "fog-day.svg",                   "night": "fog-night.svg"},
    "Haze":        {"day": "haze.svg",                      "night": "haze.svg"},
    "Dust":        {"day": "dust-day.svg",                  "night": "dust-night.svg"},
    "Sand":        {"day": "dust.svg",                      "night": "dust.svg"},
    "Smoke":       {"day": "smoke.svg",                      "night": "smoke.svg"},
    "Ash":         {"day": "dust.svg",                       "night": "dust.svg"},
    "Squall":      {"day": "wind.svg",                      "night": "wind.svg"},
    "Tornado":     {"day": "wind.svg",                      "night": "wind.svg"},
}
WEATHER_ICON_FALLBACK = "partly-cloudy-day.svg"

# Flat weather-condition -> SVG mapping (condition display key -> vector path).
# Coexists with WEATHER_ICON_SVG (which keys off the OWM `main condition` +
# is_day flag). Kept for code paths that resolve an icon by display name.
WEATHER_ICON_MAP = {
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
}

# Sunrise / sunset visuals (also Meteocons).
SUNRISE_ICON_SVG = "sunrise.svg"
SUNSET_ICON_SVG = "sunset.svg"


# ---------------- General UI icons (Tabler Icons webfont) ----------------
UI_ICON_MAP = {
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
    "health":          "ti ti-stethoscope",
    "stethoscope":     "ti ti-stethoscope",
    "shield":          "ti ti-shield-check",
    "mood-good":       "ti ti-mood-smile",
    "mood-ok":         "ti ti-mood-neutral",
    "mood-bad":        "ti ti-mood-sad",
    "mood-puzzled":    "ti ti-mood-puzzled",
    "settings":        "ti ti-settings",
}


# ---------------- Clothing icons (Tabler) ----------------
CLOTHING_ICON_MAP = {
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
}


# ---------------- Activity icons (Tabler) ----------------
ACTIVITY_ICON_MAP = {
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
}


# ---------------- Country / language flags (flag-icons) ----------------
FLAG_ICON_MAP = {
    "fr": "fi fi-fr",
    "gb": "fi fi-gb",
    "ml": "fi fi-ml",
    "sn": "fi fi-sn",
    "jp": "fi fi-jp",
    "us": "fi fi-us",
    "ae": "fi fi-ae",
}


# ---------------- Air-quality level icons (Tabler) ----------------
# Replaces the legacy emoji AQI icons (apple / heart / tangerine / red dot…)
AQI_LEVEL_ICON_MAP = {
    1: "ti ti-mood-smile",     # excellent (green)
    2: "ti ti-mood-smile",     # good
    3: "ti ti-mood-neutral",   # moderate
    4: "ti ti-mood-sad",       # bad
    5: "ti ti-mood-angry",     # very bad
}


# =================================================================
#   Helpers usable from Jinja (registered as filters/globals in app.py)
# =================================================================
ICON_BASE = "/static/icons/meteocons/"
_ICON_DIR = _os.path.join(_os.path.dirname(__file__), "static", "icons", "meteocons")


@lru_cache(maxsize=64)
def _read_svg(filename):
    path = _os.path.join(_ICON_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _is_day(sunrise=None, sunset=None):
    """Best-effort day/night from HH:MM sunrise/sunset strings; defaults to day."""
    try:
        now = _dt.datetime.now().strftime("%H:%M")
        if sunrise and sunset:
            return sunrise <= now < sunset
    except Exception:
        pass
    return True


def weather_icon(condition, sunrise=None, sunset=None, is_day=None):
    """Return an inline <svg> wrapped in a <span> for the given OWM condition."""
    if is_day is None:
        is_day = _is_day(sunrise, sunset)
    entry = WEATHER_ICON_SVG.get(condition, {})
    fname = entry.get("day" if is_day else "night") or WEATHER_ICON_FALLBACK
    svg = _read_svg(fname)
    svg = svg.replace("<svg", '<svg width="100%" height="100%"', 1)
    return Markup(
        '<span class="weather-icon-meteocon" aria-hidden="true" data-condition="{}" data-isday="{}">{}</span>'
    ).format(condition or "", "true" if is_day else "false", Markup(svg))


def weather_icon_path(condition, is_day=True):
    entry = WEATHER_ICON_SVG.get(condition, {})
    return ICON_BASE + (entry.get("day" if is_day else "night") or WEATHER_ICON_FALLBACK)


def weather_icon_css_class(condition, is_day=True):
    """Return a kebab-case CSS modifier class for the weather condition + day/night."""
    mapping = {
        "Clear":        "clear-day" if is_day else "clear-night",
        "Clouds":       "partly-cloudy-day" if is_day else "partly-cloudy-night",
        "Rain":         "rain",
        "Drizzle":      "drizzle",
        "Thunderstorm": "thunderstorm",
    }
    return mapping.get(condition, (condition or "").lower() or "cloudy")


def ui_icon(key):
    cls = UI_ICON_MAP.get(key, "ti ti-help")
    return Markup('<i class="{}" aria-hidden="true"></i>').format(cls)


def clothing_icon(key="jacket"):
    return Markup('<i class="{}" aria-hidden="true"></i>').format(CLOTHING_ICON_MAP.get(key, CLOTHING_ICON_MAP["jacket"]))


def activity_icon(key="running"):
    return Markup('<i class="{}" aria-hidden="true"></i>').format(ACTIVITY_ICON_MAP.get(key, ACTIVITY_ICON_MAP["running"]))


def flag_icon(code):
    cls = FLAG_ICON_MAP.get((code or "").lower(), "fi fi-xx")
    return Markup('<span class="{}" aria-hidden="true"></span>').format(cls)


def aqi_icon(level):
    cls = AQI_LEVEL_ICON_MAP.get(int(level) if level is not None else 3, "ti ti-mood-neutral")
    return Markup('<i class="{}" aria-hidden="true"></i>').format(cls)


def sunrise_icon():
    svg = _read_svg(SUNRISE_ICON_SVG)
    svg = svg.replace("<svg", '<svg width="100%" height="100%"', 1)
    return Markup(
        '<span class="weather-icon-meteocon" aria-hidden="true" data-condition="sunrise">{}</span>'
    ).format(Markup(svg))


def sunset_icon():
    svg = _read_svg(SUNSET_ICON_SVG)
    svg = svg.replace("<svg", '<svg width="100%" height="100%"', 1)
    return Markup(
        '<span class="weather-icon-meteocon" aria-hidden="true" data-condition="sunset">{}</span>'
    ).format(Markup(svg))


def register_icon_helpers(app):
    """Hook icons into Jinja (both filter `|x` and global `x()` syntax)."""
    g = app.jinja_env.globals
    f = app.jinja_env.filters
    for fn in (ui_icon, clothing_icon, activity_icon, flag_icon, aqi_icon,
               sunrise_icon, sunset_icon, weather_icon, weather_icon_path,
               weather_icon_css_class, _is_day,
               strip_emoji, escape_html, strip_emoji_and_escape):
        g[fn.__name__] = fn
        f[fn.__name__] = fn
    # expose maps too for advanced use
    g["UI_ICON_MAP"] = UI_ICON_MAP
    g["FLAG_ICON_MAP"] = FLAG_ICON_MAP
    g["WEATHER_ICON_SVG"] = WEATHER_ICON_SVG
    g["WEATHER_ICON_MAP"] = WEATHER_ICON_MAP
    g["CLOTHING_ICON_MAP"] = CLOTHING_ICON_MAP
    g["ACTIVITY_ICON_MAP"] = ACTIVITY_ICON_MAP
    g["AQI_LEVEL_ICON_MAP"] = AQI_LEVEL_ICON_MAP