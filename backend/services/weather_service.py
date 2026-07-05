import json
import math
import re
import time
import requests
import concurrent.futures
from datetime import datetime, timezone, timedelta
from collections import Counter

from backend.config import (
    OPENWEATHER_API_KEY, BASE_URL, GEO_URL, AIR_URL, ONECALL_URL,
    CACHE_TTL, TILE_CACHE_TTL
)
from backend.icon_map import weather_icon_path, _is_day
from backend.services.ai_engine import ai_engine, get_ai_recommendations


def calculate_moon_phase(date=None):
    """Pure-math moon phase calculation. No API call needed."""
    if date is None:
        date = datetime.now(timezone.utc)
    synodic_month = 29.530588861
    known_new_moon = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
    days_since = (date - known_new_moon).total_seconds() / 86400
    age = days_since % synodic_month

    illumination = round((1 - math.cos(2 * math.pi * age / synodic_month)) / 2 * 100)

    if age < 1.84566:
        name, key = "Nouvelle lune", "new"
    elif age < 5.53699:
        name, key = "Premier croissant", "waxing-crescent"
    elif age < 9.22831:
        name, key = "Premier quartier", "first-quarter"
    elif age < 12.91963:
        name, key = "Lune gibbeuse croissante", "waxing-gibbous"
    elif age < 16.61096:
        name, key = "Pleine lune", "full"
    elif age < 20.30228:
        name, key = "Lune gibbeuse décroissante", "waning-gibbous"
    elif age < 23.99361:
        name, key = "Dernier quartier", "last-quarter"
    elif age < 27.68493:
        name, key = "Dernier croissant", "waning-crescent"
    else:
        name, key = "Nouvelle lune", "new"

    return {"phase_name": name, "phase_key": key, "illumination": illumination, "age_days": round(age, 1)}


# ==================== SIMPLE IN-MEMORY CACHE ====================
_cache = {}

def cache_get(key):
    item = _cache.get(key)
    if item and (time.time() - item["ts"]) < CACHE_TTL:
        return item["data"]
    return None

def cache_set(key, data):
    _cache[key] = {"data": data, "ts": time.time()}

def _redact(text: str) -> str:
    """Remove sensitive values (e.g. API keys) from log messages."""
    # Redact appid=... or any key-like query values
    text = re.sub(r'([?&]appid=)[^&#\s]+', r'\1REDACTED', text, flags=re.IGNORECASE)
    text = re.sub(r'([?&]key=)[^&#\s]+', r'\1REDACTED', text, flags=re.IGNORECASE)
    return text


# Global flags for optimization
_parse_weather_cache = {}
onecall_available = True


def fetch_json(url, params):
    """Cached HTTP GET → JSON. Returns None on failure.

    One Call 3.0 (/onecall) commonly returns 401 on free-tier keys.
    The code falls back gracefully (default UV index).
    """
    global onecall_available
    # Build cache key WITHOUT secrets (hash params except appid)
    safe_params = {k: v for k, v in params.items() if k.lower() != "appid"}
    cache_key = url + json.dumps(sorted(safe_params.items()), sort_keys=True)
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        res = requests.get(url, params=params, timeout=8)
        res.raise_for_status()
        data = res.json()
        cache_set(cache_key, data)
        return data
    except requests.exceptions.HTTPError as e:
        status = getattr(e.response, 'status_code', None)
        if status in (401, 403) and "onecall" in url:
            # Expected for free OpenWeatherMap accounts (One Call 3.0 is paid).
            # UV index will use the safe default (5 / "Modéré").
            onecall_available = False
            print("[fetch_json] OneCall API access not available (401/403). Disabling future OneCall requests for speed.")
        else:
            safe_msg = _redact(str(e))
            print(f"[fetch_json] HTTP error fetching {url}: {safe_msg}")
        return None
    except requests.exceptions.RequestException as e:
        # Network / timeout / connection errors etc.
        print(f"[fetch_json] Network error for {url}: {type(e).__name__}")
        return None
    except Exception as e:
        safe_msg = _redact(str(e))
        print(f"[fetch_json] Error fetching {url}: {safe_msg}")
        return None


# ==================== SECURE MAP TILE PROXY (key never leaves server) ====================
# Separate lightweight cache for binary tile images (30 min TTL)
_tile_cache = {}

def tile_cache_get(key):
    item = _tile_cache.get(key)
    if item and (time.time() - item["ts"]) < TILE_CACHE_TTL:
        return item["data"]
    return None

def tile_cache_set(key, data):
    # Keep cache bounded (simple LRU-ish by size)
    if len(_tile_cache) > 80:
        # drop oldest
        oldest = min(_tile_cache.keys(), key=lambda k: _tile_cache[k]["ts"])
        _tile_cache.pop(oldest, None)
    _tile_cache[key] = {"data": data, "ts": time.time()}


# ==================== HELPERS ====================
def get_aqi_details(aqi):
    aqi_map = {
        1:{"label":"Très Bon",   "icon":"🍏","color":"#22c55e"},
        2:{"label":"Bon",        "icon":"💛","color":"#eab308"},
        3:{"label":"Modéré",     "icon":"🍊","color":"#f97316"},
        4:{"label":"Mauvais",    "icon":"🔴","color":"#ef4444"},
        5:{"label":"Très Mauvais","icon":"☣️","color":"#7c3aed"}
    }
    return aqi_map.get(aqi, {"label":"Inconnu","icon":"⚪","color":"#94a3b8"})

def get_uv_details(uv_index):
    if uv_index <= 2:   return {"risk":"Faible",       "color":"#22c55e",  "advice":"Pas de protection nécessaire."}
    if uv_index <= 5:   return {"risk":"Modéré",       "color":"#eab308",  "advice":"Lunettes de soleil recommandées."}
    if uv_index <= 7:   return {"risk":"Élevé",        "color":"#f97316",  "advice":"Crème solaire SPF 30+ obligatoire."}
    if uv_index <= 10:  return {"risk":"Très élevé",   "color":"#ef4444",  "advice":"Évitez le soleil entre 10h et 16h."}
    return                     {"risk":"Extrême",      "color":"#7c3aed",  "advice":"Restez à l'ombre. SPF 50+ nécessaire."}

def build_forecast(forecast_data, units_param):
    """Parse OWM forecast into per-day summaries."""
    forecast_by_day = {}
    fr_days = {"Monday":"Lundi","Tuesday":"Mardi","Wednesday":"Mercredi",
               "Thursday":"Jeudi","Friday":"Vendredi","Saturday":"Samedi","Sunday":"Dimanche"}
    for item in forecast_data.get("list", []):
        dt_obj   = datetime.fromtimestamp(item["dt"])
        day_str  = dt_obj.strftime("%d/%m")
        day_name = fr_days.get(dt_obj.strftime("%A").capitalize(), dt_obj.strftime("%A"))
        if day_str not in forecast_by_day:
            forecast_by_day[day_str] = {
                "jour":day_name,"date":day_str,
                "temps_max":[],"temps_min":[],"conditions":[],"descriptions":[],"humidites":[],"vents":[]
            }
        d = forecast_by_day[day_str]
        d["temps_max"].append(item["main"]["temp_max"])
        d["temps_min"].append(item["main"]["temp_min"])
        d["conditions"].append(item["weather"][0]["main"])
        d["descriptions"].append(item["weather"][0]["description"])
        d["humidites"].append(item["main"]["humidity"])
        d["vents"].append(item["wind"]["speed"])

    previsions = []
    for d_str, data in list(forecast_by_day.items())[:5]:
        cond = Counter(data["conditions"]).most_common(1)[0][0]
        desc = Counter(data["descriptions"]).most_common(1)[0][0]
        previsions.append({
            "jour":    data["jour"],
            "date":    data["date"],
            "condition": cond,
            "description": desc.capitalize(),
            "temp_max": round(max(data["temps_max"])),
            "temp_min": round(min(data["temps_min"])),
            "humidite": round(sum(data["humidites"]) / len(data["humidites"])),
            "vent":     round(sum(data["vents"]) / len(data["vents"]), 1),
            "icone":    weather_icon_path(cond, True)
        })
    return previsions

def parse_weather(city, unit="C", lang="fr", skip_ai=False):
    """Fetch and parse all weather data for a city. Returns (meteo_dict, extras_dict) or raises.

    When skip_ai=True, the Groq AI recommendation call is skipped entirely
    so the page can render weather data immediately (Phase 1 progressive loading).
    """
    global onecall_available
    # Global Cache Check
    cache_key = f"{city.lower()}_{unit}_{lang}"
    now = time.time()
    if cache_key in _parse_weather_cache:
        cached_entry = _parse_weather_cache[cache_key]
        if (now - cached_entry["ts"]) < 600:  # 10 minutes cache
            print(f"[parse_weather] Global Cache HIT for {city}")
            return cached_entry["data"], None

    units_param = "imperial" if unit == "F" else "metric"
    api_lang = lang if lang in ("fr", "en") else "fr"

    # Geocoding
    geo_data = fetch_json(f"{GEO_URL}/direct", {"q": city, "limit": 1, "appid": OPENWEATHER_API_KEY})
    if not geo_data:
        return None, "Ville introuvable. Veuillez vérifier l'orthographe."

    lat, lon     = geo_data[0]["lat"], geo_data[0]["lon"]
    display_name = geo_data[0]["name"]
    country      = geo_data[0].get("country", "")

    # Fetch remaining weather APIs in parallel to reduce network latency
    current = None
    forecast_raw = None
    air_raw = None
    onecall = None

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            "current": executor.submit(fetch_json, f"{BASE_URL}/weather", {"lat":lat,"lon":lon,"units":units_param,"lang":api_lang,"appid":OPENWEATHER_API_KEY}),
            "forecast": executor.submit(fetch_json, f"{BASE_URL}/forecast", {"lat":lat,"lon":lon,"units":units_param,"lang":api_lang,"appid":OPENWEATHER_API_KEY}),
            "air": executor.submit(fetch_json, AIR_URL, {"lat":lat,"lon":lon,"appid":OPENWEATHER_API_KEY})
        }
        
        if onecall_available:
            futures["onecall"] = executor.submit(fetch_json, ONECALL_URL, {"lat":lat,"lon":lon,"exclude":"minutely,hourly,daily,alerts","appid":OPENWEATHER_API_KEY})

        # Wait for all futures to resolve
        current = futures["current"].result()
        forecast_raw = futures["forecast"].result()
        air_raw = futures["air"].result()
        if "onecall" in futures:
            onecall = futures["onecall"].result()

    if not current:
        return None, "Impossible de récupérer les données météo. Réessayez."

    main_cond  = current["weather"][0]["main"]
    temp       = round(current["main"]["temp"])
    wind_speed = current["wind"]["speed"]
    wind_deg   = current.get("wind", {}).get("deg", 0)
    humidity   = current["main"]["humidity"]

    tz_offset = current.get("timezone", 0)
    city_tz = timezone(timedelta(seconds=tz_offset))

    city_now = datetime.fromtimestamp(current["dt"], tz=timezone.utc).astimezone(city_tz)
    sunrise_local = datetime.fromtimestamp(current["sys"]["sunrise"], tz=timezone.utc).astimezone(city_tz)
    sunset_local = datetime.fromtimestamp(current["sys"]["sunset"], tz=timezone.utc).astimezone(city_tz)

    hour = city_now.hour
    if 5 <= hour < 12:       moment_journee = "morning"
    elif 12 <= hour < 18:    moment_journee = "afternoon"
    elif 18 <= hour < 22:    moment_journee = "evening"
    else:                    moment_journee = "night"

    lever_soleil_val   = sunrise_local.strftime("%H:%M")
    coucher_soleil_val = sunset_local.strftime("%H:%M")
    is_day             = sunrise_local.time() <= city_now.time() <= sunset_local.time()

    _moon = calculate_moon_phase()

    meteo = {
        "erreur":             None,
        "ville":              display_name,
        "pays":               country,
        "lat":                lat,
        "lon":                lon,
        "icone":              weather_icon_path(main_cond, is_day),
        "condition":          main_cond,
        "est_jour":           is_day,
        "temperature":        temp,
        "temperature_reelle": round(current["main"]["feels_like"]),
        "description":        current["weather"][0]["description"].capitalize(),
        "temp_min":           round(current["main"]["temp_min"]),
        "temp_max":           round(current["main"]["temp_max"]),
        "humidite":           humidity,
        "vent":               wind_speed,
        "vent_deg":           wind_deg,
        "lever_soleil":       lever_soleil_val,
        "coucher_soleil":     coucher_soleil_val,
        "heure_locale":       city_now.strftime("%H:%M"),
        "moment_journee":     moment_journee,
        "visibilite":         round(current.get("visibility", 0) / 1000, 1),
        "nuages":             current["clouds"]["all"],
        "tz_offset_secondes": tz_offset,
        "pression":           current["main"]["pressure"],
        "phase_lune":         _moon["phase_name"],
        "phase_lune_cle":     _moon["phase_key"],
        "illumination_lune":  _moon["illumination"],
        "date":               datetime.fromtimestamp(current["dt"]).strftime("%d/%m/%Y"),
        "unite":              unit
    }

    # Hourly next 24h
    hourly = []
    if forecast_raw:
        for item in forecast_raw.get("list", [])[:8]:
            hourly.append({
                "heure": datetime.fromtimestamp(item["dt"]).strftime("%H:%M"),
                "temp":  round(item["main"]["temp"]),
                "hum":   item["main"]["humidity"],
                "wind":  round(item["wind"]["speed"], 1)
            })

    # 5-day forecast
    previsions = build_forecast(forecast_raw, units_param) if forecast_raw else []

    # Air quality
    qualite_air = None
    if air_raw and air_raw.get("list"):
        aqi_val    = air_raw["list"][0]["main"]["aqi"]
        aqi_detail = get_aqi_details(aqi_val)
        qualite_air = {
            "aqi":   aqi_val,
            "label": aqi_detail["label"],
            "icon":  aqi_detail["icon"],
            "color": aqi_detail["color"],
            "pm25":  round(air_raw["list"][0]["components"]["pm2_5"], 1),
            "pm10":  round(air_raw["list"][0]["components"]["pm10"],  1),
            "no2":   round(air_raw["list"][0]["components"].get("no2", 0), 1),
            "o3":    round(air_raw["list"][0]["components"].get("o3",  0), 1),
        }

    # UV Index (graceful fallback if unavailable)
    uv = {"index": 5, "risk": "Modéré", "color": "#f97316", "advice": "Portez des lunettes et appliquez de l'écran solaire."}
    if onecall and "current" in onecall:
        uv_index = onecall["current"].get("uvi", 5)
        uv_detail = get_uv_details(uv_index)
        uv = {"index": round(uv_index, 1), **uv_detail}

    # Alerts
    alerts = []
    if main_cond == "Thunderstorm":
        alerts.append({"type":"danger","icon":"Thunderstorm","title":"Alerte Orages","msg":"Des coupures électriques ou inondations locales restent possibles."})
    elif main_cond == "Snow" and (temp < 0 if unit == "C" else temp < 32):
        alerts.append({"type":"warning","icon":"Snow","title":"Vigilance Verglas","msg":"Les chaussées peuvent être glissantes."})
    if humidity > 90:
        alerts.append({"type":"warning","icon":"💧","title":"Humidité extrême","msg":"Conditions très humides. Prenez soin de vous hydrater."})

    # Compute temp in Celsius for AI/comfort calculations
    temp_c = round((temp - 32) * 5/9) if unit == "F" else temp

    # AI recommendations (skippable for progressive loading)
    if skip_ai:
        recommendations = None
    else:
        # Real AI recommendations using Groq (with fallback) - expanded context
        feels_for_ai = round(current["main"]["feels_like"])
        aqi_for_ai = qualite_air["aqi"] if qualite_air else None
        uv_for_ai = uv.get("index") if isinstance(uv, dict) else None
        recommendations = get_ai_recommendations(
            temp_c, main_cond, wind_speed, humidity, display_name, lang,
            feels_like=feels_for_ai, hourly=hourly, uv_index=uv_for_ai, aqi=aqi_for_ai,
            heure_locale=meteo["heure_locale"], moment_journee=meteo["moment_journee"],
            est_jour=meteo["est_jour"], lever_soleil=meteo["lever_soleil"], coucher_soleil=meteo["coucher_soleil"],
            pressure=meteo["pression"], cloud_cover=meteo["nuages"], visibility=meteo["visibilite"]
        )

    # Comfort index is always computed (simple math, not AI)
    comfort_index = ai_engine._calculate_comfort_index(temp_c, humidity)

    # Best day picker (always uses the previsions list)
    best_days = {act: ai_engine.get_best_day(previsions, act) for act in ["running","picnic","driving","beach"]}

    result = {
        "meteo":           meteo,
        "recommendations": recommendations,
        "comfort_index":   comfort_index,
        "hourly":          hourly,
        "previsions":      previsions,
        "qualite_air":     qualite_air,
        "uv":              uv,
        "alerts":          alerts,
        "best_days":       best_days,
    }
    _parse_weather_cache[cache_key] = {"data": result, "ts": time.time()}
    return result, None
