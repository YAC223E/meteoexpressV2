import time
import requests
from flask import Blueprint, render_template, request, jsonify, Response, stream_with_context

from backend.config import OPENWEATHER_API_KEY, GEO_URL
from backend.services.weather_service import (
    parse_weather, fetch_json, cache_get, cache_set,
    tile_cache_get, tile_cache_set
)
from backend.services.city_search import search_cities
from backend.services.ai_engine import stream_recommendation
from backend.auth.session import read_session
from backend.auth.models import UserProfile

SESSION_COOKIE = "meteoexpress_session"


def _get_profile():
    token = request.cookies.get(SESSION_COOKIE)
    user = read_session(token)
    if not user:
        return None
    profile = UserProfile.find_by_user_id(user["user_id"])
    if not profile.id:
        return None
    return {
        "age": profile.age,
        "occupation": profile.occupation,
        "allergies": profile.allergies,
        "chronic_conditions": profile.chronic_conditions,
    }

weather_bp = Blueprint('weather', __name__)


# ==================== SECURE MAP TILE PROXY (key never leaves server) ====================
@weather_bp.route("/map-tiles/<path:tile_path>")
def map_tiles(tile_path):
    """Proxy OpenWeatherMap map tiles through the server.

    This is a critical security + optimization improvement:
    - The real API key is NEVER sent to the browser.
    - We add server-side caching to reduce quota usage and improve speed.
    - Frontend calls relative URLs like /map-tiles/precipitation_new/5/12/34.png
    """
    if ".." in tile_path or not tile_path.lower().endswith((".png", ".jpg", ".jpeg")):
        return "Invalid tile request", 400

    cache_key = tile_path
    cached = tile_cache_get(cache_key)
    if cached is not None:
        return Response(cached, mimetype="image/png",
                        headers={"Cache-Control": "public, max-age=1800", "X-Cache": "HIT"})

    url = f"https://tile.openweathermap.org/map/{tile_path}?appid={OPENWEATHER_API_KEY}"
    try:
        res = requests.get(url, timeout=12)
        res.raise_for_status()
        data = res.content
        tile_cache_set(cache_key, data)
        return Response(data, mimetype="image/png",
                        headers={"Cache-Control": "public, max-age=1800", "X-Cache": "MISS"})
    except Exception as e:
        print(f"[map_tiles] Proxy error for {tile_path}: {e}")
        # Return a minimal 1x1 transparent PNG so the map doesn't completely break
        transparent_png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154c0a5d50000000049454e44ae426082"
        )
        return Response(transparent_png, mimetype="image/png", status=502)


# ==================== ROUTES ====================

@weather_bp.route("/")
def accueil():
    city = request.args.get("city", "").strip()
    unit = request.args.get("unit", "C")
    lang = request.args.get("lang", "fr")

    if not city:
        return render_template("index.html", meteo=None, recherche="", unite=unit, lang=lang)

    result, error = parse_weather(city, unit, lang, skip_ai=True)
    if error:
        return render_template("index.html", meteo={"erreur": error}, recherche=city, unite=unit, lang=lang)

    return render_template("index.html", recherche=city, unite=unit, lang=lang, **result)


@weather_bp.route("/compare")
def compare():
    city1 = request.args.get("city1", "").strip()
    city2 = request.args.get("city2", "").strip()
    unit  = request.args.get("unit", "C")
    lang  = request.args.get("lang", "fr")

    if not city1 or not city2:
        return render_template("compare.html", data1=None, data2=None, city1=city1, city2=city2, unite=unit, lang=lang)

    result1, err1 = parse_weather(city1, unit, lang)
    result2, err2 = parse_weather(city2, unit, lang)

    return render_template(
        "compare.html",
        data1=result1, err1=err1,
        data2=result2, err2=err2,
        city1=city1, city2=city2, unite=unit, lang=lang
    )


@weather_bp.route("/autocomplete")
def autocomplete():
    import re
    q = request.args.get("q", "").strip().lower()
    if len(q) < 2:
        return jsonify([])
    q = re.sub(r'\s+', ' ', q)
    # Try local dataset first (<1ms for common queries)
    local = search_cities(q)
    if local:
        return jsonify(local)
    # Fall back to OWM Geocoding API (rare — only for obscure/typo queries)
    cache_key = f"ac_{q}"
    cached = cache_get(cache_key)
    if cached is not None:
        return jsonify(cached)
    geo = fetch_json(f"{GEO_URL}/direct", {"q": q, "limit": 5, "appid": OPENWEATHER_API_KEY})
    if not geo:
        cache_set(cache_key, [])
        return jsonify([])
    results = [{"name": f"{g['name']}, {g.get('country','')}", "lat": g["lat"], "lon": g["lon"]} for g in geo]
    cache_set(cache_key, results)
    return jsonify(results)


@weather_bp.route("/reverse-geocode")
def reverse_geocode():
    """Convert lat/lon to city name for geolocation feature."""
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Missing lat/lon"}), 400
    geo = fetch_json(f"{GEO_URL}/reverse", {"lat": lat, "lon": lon, "limit": 1, "appid": OPENWEATHER_API_KEY})
    if not geo:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"city": geo[0]["name"], "country": geo[0].get("country","")})


@weather_bp.route("/export-pdf")
def export_pdf():
    """Generate a simple weather report as downloadable text (HTML-based PDF via print dialog)."""
    city = request.args.get("city", "").strip()
    unit = request.args.get("unit", "C")
    lang = request.args.get("lang", "fr")
    if not city:
        return "No city specified", 400
    result, error = parse_weather(city, unit, lang)
    if error:
        return error, 500
    return render_template("report.html", **result, unite=unit, city=city, lang=lang)


# ==================== JSON API FOR REACT FRONTEND ====================
@weather_bp.route("/api/weather")
def api_weather():
    """Clean JSON endpoint for the new React dashboard. Preserves all existing parsing + AI logic."""
    city = request.args.get("city", "").strip()
    unit = request.args.get("unit", "C")
    lang = request.args.get("lang", "fr")

    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    result, error = parse_weather(city, unit, lang)
    if error:
        return jsonify({"error": error}), 404

    # Attach context for frontend
    payload = {
        **result,
        "unit": unit,
        "lang": lang,
        "timestamp": int(time.time())
    }
    return jsonify(payload)


@weather_bp.route("/api/health")
def api_health():
    return jsonify({"status": "ok", "service": "Météo Express Pro API"})


@weather_bp.route("/api/ai-recommendation")
def api_ai_recommendation():
    """Stream AI recommendations via Server-Sent Events.

    Query params:
        city    – city name (required)
        weather – short weather summary string (required)
        lang    – "fr" or "en" (default "fr")
    """
    city = request.args.get("city", "").strip()
    weather = request.args.get("weather", "").strip()
    lang = request.args.get("lang", "fr")

    if not city or not weather:
        return jsonify({"error": "city and weather parameters are required"}), 400

    profile = _get_profile()
    return Response(
        stream_with_context(stream_recommendation(city, weather, lang, profile=profile)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


# Convenience aliases so frontend can call /api/* uniformly if desired
@weather_bp.route("/api/autocomplete")
def api_autocomplete():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify([])
    geo = fetch_json(f"{GEO_URL}/direct", {"q": q, "limit": 5, "appid": OPENWEATHER_API_KEY})
    if not geo:
        return jsonify([])
    results = [{"name": f"{g['name']}, {g.get('country','')}", "lat": g["lat"], "lon": g["lon"]} for g in geo]
    return jsonify(results)


@weather_bp.route("/api/reverse-geocode")
def api_reverse_geocode():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Missing lat/lon"}), 400
    geo = fetch_json(f"{GEO_URL}/reverse", {"lat": lat, "lon": lon, "limit": 1, "appid": OPENWEATHER_API_KEY})
    if not geo:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"city": geo[0]["name"], "country": geo[0].get("country","")})


@weather_bp.route("/api/chat", methods=["POST"])
def api_chat():
    """Chatbot endpoint — proxies to Groq with weather context."""
    from backend.services.ai_engine import groq_client, GROQ_PRIMARY_MODEL

    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    weather_ctx = data.get("weather", "")
    if not message:
        return jsonify({"error": "message is required"}), 400

    if not groq_client:
        return jsonify({"reply": "Assistant indisponible pour le moment."})

    profile = _get_profile()
    profile_context = ""
    if profile:
        parts = []
        if profile.get("age"):
            parts.append(f"- Age: {profile['age']}")
        if profile.get("occupation"):
            parts.append(f"- Occupation: {profile['occupation']}")
        if profile.get("allergies"):
            parts.append(f"- Allergies: {profile['allergies']}")
        if profile.get("chronic_conditions"):
            parts.append(f"- Conditions: {profile['chronic_conditions']}")
        if parts:
            profile_context = "\nUser profile for context:\n" + "\n".join(parts) + "\n"
            profile_context += "\nGive only general precautionary advice, never medical diagnosis. Append a disclaimer when health-adjacent.\n"

    system = (
        "You are a helpful weather assistant for the app Météo Express Pro. "
        "Answer only weather-related questions in the same language the user writes in. "
        f"Current weather data: {weather_ctx}. "
        f"{profile_context}"
        "Keep answers short and practical, under 3 sentences."
    )
    try:
        resp = groq_client.chat.completions.create(
            model=GROQ_PRIMARY_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": message},
            ],
            temperature=0.5,
            max_tokens=256,
        )
        reply = resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Chat] Error: {e}")
        reply = "Désolé, une erreur est survenue. Réessayez."

    return jsonify({"reply": reply})
