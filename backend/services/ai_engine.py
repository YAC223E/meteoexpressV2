import json
import time

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

from backend.config import GROQ_API_KEY, GROQ_PRIMARY_MODEL, GROQ_FALLBACK_MODEL

# ==================== GROQ CLIENT INITIALIZATION ====================
groq_client = None
if GROQ_API_KEY and GROQ_AVAILABLE:
    groq_client = Groq(api_key=GROQ_API_KEY)
    print(f"[AI] Groq client initialized. Primary model: {GROQ_PRIMARY_MODEL}")
else:
    if not GROQ_API_KEY:
        print("[AI] No GROQ_API_KEY found - falling back to rule-based AI")

# Global flags for optimization
_recommendations_cache = {}
ai_backoff_until = 0


# ==================== AI RECOMMENDATION ENGINE ====================
class WeatherAI:
    def __init__(self):
        self.clothing_rules = {
            "freezing": {"temp_max": 0,  "items": ["🧥 Manteau d'hiver épais", "🧣 Écharpe", "🧤 Gants", "🥾 Bottes chaudes"]},
            "cold":     {"temp_max": 10, "items": ["🧥 Veste chaude", "👖 Pantalon épais", "🧣 Écharpe légère"]},
            "cool":     {"temp_max": 18, "items": ["🧥 Veste légère", "👖 Jean", "👟 Baskets"]},
            "mild":     {"temp_max": 24, "items": ["👕 T-shirt manches longues", "👖 Pantalon léger", "😎 Lunettes de soleil"]},
            "warm":     {"temp_max": 30, "items": ["👕 T-shirt", "🩳 Short", "👡 Sandales", "🧴 Crème solaire"]},
            "hot":      {"temp_max": 100,"items": ["🎽 Débardeur", "🩳 Short léger", "👒 Chapeau", "🧴 SPF 50+", "💧 Bouteille d'eau"]}
        }
        self.activity_rules = {
            "Clear":       {"icon": "☀️", "activities": ["🏃 Course à pied", "🚴 Vélo", "🏊 Swimming", "🧺 Pique-nique", "📸 Photographie"], "warning": None},
            "Clouds":      {"icon": "☁️", "activities": ["🚶 Randonnée", "🏃 Jogging", "📚 Lecture au parc", "🛍️ Shopping"], "warning": None},
            "Rain":        {"icon": "🌧️", "activities": ["🎬 Cinéma", "🏛️ Musée", "☕ Café", "📖 Bibliothèque", "🛒 Courses"], "warning": "☔ Prenez un parapluie ou un imperméable"},
            "Drizzle":     {"icon": "🌦️", "activities": ["☕ Terrasse couverte", "🛍️ Shopping", "🎳 Bowling"], "warning": "🧥 Veste imperméable recommandée"},
            "Thunderstorm":{"icon": "⛈️", "activities": ["🏠 Restez chez vous", "🎮 Jeux vidéo", "📺 Films/séries", "📚 Lecture"], "warning": "⚡ Danger ! Évitez les espaces ouverts et les arbres"},
            "Snow":        {"icon": "❄️", "activities": ["⛷️ Ski", "🛷 Luge", "☃️ Bonhomme de neige", "☕ Chocolat chaud"], "warning": "🥾 Chaussures antidérapantes obligatoires"},
            "Mist":        {"icon": "🌫️", "activities": ["🚶 Promenade brumeuse", "📸 Photos artistiques"], "warning": "🚗 Réduisez votre vitesse en voiture"},
            "Fog":         {"icon": "🌫️", "activities": ["🏠 Activités d'intérieur"], "warning": "👀 Visibilité réduite - soyez prudent"}
        }
        self.health_rules = {
            "extreme_heat": {"temp_min": 35,       "advice": "🔥 Risque de coup de chaleur. Restez hydraté et évitez le soleil.",           "severity": "high"},
            "strong_heat":  {"temp_min": 30,       "advice": "☀️ Chaleur forte. Buvez beaucoup d'eau.",                                      "severity": "medium"},
            "cold_warning": {"temp_max": 5,        "advice": "🧊 Froid intense. Couvrez-vous bien.",                                          "severity": "medium"},
            "windy":        {"wind_min": 10,       "advice": "💨 Vent fort. Attention aux objets susceptibles de s'envoler.",                 "severity": "low"},
            "humid":        {"humidity_min": 80,  "advice": "💧 Humidité élevée. Attention aux personnes sensibles.",                         "severity": "low"}
        }
        self.travel_rules = {
            "Rain":        "⚠️ Routes glissantes possibles. Augmentez la distance de sécurité.",
            "Thunderstorm":"🚫 Évitez de voyager si possible. Risque d'inondations.",
            "Snow":        "❄️ Équipement hivernal obligatoire. Chaînes peut-être nécessaires.",
            "Fog":         "🌫️ Allumez vos antibrouillards. Roulez doucement.",
            "Clear":       "✅ Conditions de conduite idéales.",
            "Clouds":      "✅ Bonnes conditions de conduite."
        }
        self.activity_scores = {
            "running":  {"Clear": 5, "Clouds": 4, "Drizzle": 2, "Rain": 1, "Thunderstorm": 0, "Snow": 1},
            "picnic":   {"Clear": 5, "Clouds": 3, "Drizzle": 1, "Rain": 0, "Thunderstorm": 0, "Snow": 0},
            "driving":  {"Clear": 5, "Clouds": 5, "Drizzle": 3, "Rain": 2, "Thunderstorm": 1, "Snow": 1},
            "beach":    {"Clear": 5, "Clouds": 3, "Drizzle": 1, "Rain": 0, "Thunderstorm": 0, "Snow": 0},
        }

    def get_clothing(self, temp):
        for _, rule in self.clothing_rules.items():
            if temp <= rule["temp_max"]:
                return rule["items"]
        return self.clothing_rules["mild"]["items"]

    def get_activities(self, condition):
        return self.activity_rules.get(condition, self.activity_rules["Clouds"])

    def get_health(self, temp, wind, humidity, lang="fr"):
        alerts = []
        for key, rule in self.health_rules.items():
            alert = rule.copy()
            if lang == "en":
                # Simple English translations for health alerts
                en_map = {
                    "extreme_heat": {"advice": "🔥 Heatstroke risk. Stay hydrated and avoid the sun."},
                    "strong_heat":  {"advice": "☀️ Strong heat. Drink plenty of water."},
                    "cold_warning": {"advice": "🧊 Intense cold. Dress warmly."},
                    "windy":        {"advice": "💨 Strong wind. Watch for flying objects."},
                    "humid":        {"advice": "💧 High humidity. Be careful if sensitive."}
                }
                if key in en_map:
                    alert["advice"] = en_map[key]["advice"]
            if "temp_min" in rule and temp >= rule["temp_min"]:
                alerts.append(alert)
            elif "temp_max" in rule and temp <= rule["temp_max"]:
                alerts.append(alert)
            elif "wind_min" in rule and wind >= rule["wind_min"]:
                alerts.append(alert)
            elif "humidity_min" in rule and humidity >= rule["humidity_min"]:
                alerts.append(alert)
        return alerts

    def get_travel(self, condition, lang="fr"):
        if lang == "en":
            en_travel = {
                "Rain":        "⚠️ Roads may be slippery. Increase following distance.",
                "Thunderstorm":"🚫 Avoid traveling if possible. Risk of flooding.",
                "Snow":        "❄️ Winter equipment required. Chains may be needed.",
                "Fog":         "🌫️ Turn on fog lights. Drive slowly.",
                "Clear":       "✅ Ideal driving conditions.",
                "Clouds":      "✅ Good driving conditions."
            }
            return en_travel.get(condition, "✅ Normal conditions.")
        return self.travel_rules.get(condition, "✅ Conditions normales.")

    def get_best_day(self, forecast_list, activity):
        """Return the forecast day most suited to the given activity."""
        scores = self.activity_scores.get(activity, self.activity_scores["running"])
        best_day = None
        best_score = -1
        for day in forecast_list:
            cond = day["condition"]
            temp = day["temp_max"]
            base = scores.get(cond, 2)
            # Slight temp bonus for mild days
            temp_bonus = 1 if 18 <= temp <= 28 else 0
            total = base + temp_bonus
            if total > best_score:
                best_score = total
                best_day = day
        return best_day

    def generate_recommendations(self, weather_data, lang="fr"):
        temp      = weather_data["temperature"]
        condition = weather_data["condition"]
        wind      = weather_data["vent"]
        humidity  = weather_data["humidite"]
        hourly    = weather_data.get("hourly")
        est_jour  = weather_data.get("est_jour", True)
        moment_journee = weather_data.get("moment_journee", "afternoon")

        activities = self.get_activities(condition)
        if not est_jour:
            daytime_keywords = {"running", "picnic", "photography", "swimming", "beach", "jogging", "outdoor sports"}
            filtered = [a for a in activities.get("activities", [])
                        if not any(kw in a.lower() for kw in daytime_keywords)]
            if filtered:
                activities["activities"] = filtered
            activities["icon"] = "🌙"

        rec = {
            "clothing":       self.get_clothing(temp),
            "activities":     activities,
            "health":         self.get_health(temp, wind, humidity, lang),
            "travel":         self.get_travel(condition, lang),
            "comfort_index":  self._calculate_comfort_index(temp, humidity),
            "summary":        self._generate_summary(temp, condition, wind, lang, est_jour=est_jour, moment_journee=moment_journee),
            # Expanded fields
            "best_hours":     self.get_best_hours(hourly, condition, lang),
            "pack":           self.get_pack_items(condition, lang),
            "safety_tips":    self.get_safety_tips(condition, temp, wind, lang),
            "outfit":         self.get_outfit(temp, condition, lang)
        }
        return rec

    def _calculate_comfort_index(self, temp, humidity):
        if 20 <= temp <= 26 and 40 <= humidity <= 60: return 95
        if 18 <= temp <= 28 and 30 <= humidity <= 70: return 80
        if temp < 5 or temp > 35:                     return 30
        return 60

    def _generate_summary(self, temp, condition, wind, lang="fr", est_jour=True, moment_journee="afternoon"):
        time_label = moment_journee if moment_journee in ("morning", "afternoon", "evening", "night") else "journée"
        if lang == "en":
            en_time = {"morning": "morning", "afternoon": "afternoon", "evening": "evening", "night": "night"}.get(time_label, "day")
            if condition == "Clear" and not est_jour:
                return f"Clear night sky at {temp}°C. Great for stargazing!"
            en_summaries = {
                "Clear":       f"Beautiful sunny {en_time} at {temp}°C. Perfect for outdoor activities!",
                "Clouds":      f"Cloudy weather at {temp}°C. Good conditions for walking or cycling.",
                "Rain":        f"Rain expected at {temp}°C. Don't forget an umbrella!",
                "Drizzle":     f"Light drizzle at {temp}°C. A waterproof jacket will be enough.",
                "Thunderstorm":f"Thunderstorms expected! Stay sheltered. Temperature: {temp}°C.",
                "Snow":        f"Snow at {temp}°C. Magical landscape but dangerous roads.",
                "Mist":        f"Mist at {temp}°C. Mysterious atmosphere but reduced visibility.",
                "Fog":         f"Dense fog at {temp}°C. Drive carefully."
            }
            return en_summaries.get(condition, f"Current conditions: {temp}°C, wind at {wind} m/s.")
        fr_time = {"morning": "matinée", "afternoon": "après-midi", "evening": "soirée", "night": "nuit"}.get(time_label, "journée")
        summaries = {
            "Clear":       f"Belle {fr_time} dégagée avec {temp}°C." if not est_jour else f"Belle journée ensoleillée avec {temp}°C. Parfait pour les activités d'extérieur !",
            "Clouds":      f"Temps nuageux à {temp}°C. Bonnes conditions pour marcher ou faire du vélo.",
            "Rain":        f"Pluie attendue avec {temp}°C. Pensez au parapluie !",
            "Drizzle":     f"Légère bruine à {temp}°C. Une veste imperméable suffira.",
            "Thunderstorm":f"Orages prévus ! Restez à l'abri. Température : {temp}°C.",
            "Snow":        f"Neige à {temp}°C. Paysage magique mais routes dangereuses.",
            "Mist":        f"Brume à {temp}°C. Ambiance mystérieuse mais visibilité réduite.",
            "Fog":         f"Brouillard dense à {temp}°C. Prudence sur la route."
        }
        if not est_jour and condition == "Clear":
            return f"Belle {fr_time} étoilée avec {temp}°C. Idéal pour observer le ciel !"
        return summaries.get(condition, f"Conditions actuelles : {temp}°C, vent à {wind} m/s.")

    def get_best_hours(self, hourly, condition, lang="fr"):
        """Pick promising slots from the 24h hourly list (rule based fallback)."""
        if not hourly:
            return []
        scored = []
        for h in hourly[:8]:
            t = h.get("temp", 20)
            w = h.get("wind", 2)
            score = 3
            if 17 <= t <= 27: score += 2
            if 20 <= t <= 25: score += 1
            if w > 7: score -= 1
            if condition in ("Clear", "Clouds"): score += 1
            if score >= 4:
                reason = "Température idéale" if lang == "fr" else "Ideal temperature"
                scored.append({"time": h.get("heure", ""), "reason": reason})
        if not scored and hourly:
            h0 = hourly[0]
            scored = [{"time": h0.get("heure", ""), "reason": "Meilleur créneau disponible" if lang=="fr" else "Best available window"}]
        return scored[:4]

    def get_pack_items(self, condition, lang="fr"):
        items = ["💧 Bouteille d'eau"] if lang == "fr" else ["💧 Water bottle"]
        c = (condition or "").lower()
        if "rain" in c or "drizzle" in c or "thunder" in c:
            items.append("☔ Parapluie" if lang == "fr" else "☔ Umbrella")
        if "snow" in c:
            items.append("🧤 Gants & bonnet" if lang == "fr" else "🧤 Gloves & hat")
        if "clear" in c:
            items.append("😎 Lunettes de soleil" if lang == "fr" else "😎 Sunglasses")
        items.append("📱 Téléphone chargé" if lang == "fr" else "📱 Charged phone")
        return items[:5]

    def get_safety_tips(self, condition, temp, wind, lang="fr"):
        tips = []
        c = (condition or "").lower()
        if "thunder" in c:
            tips.append("⚡ Restez à l'abri, évitez les arbres et espaces ouverts" if lang == "fr" else "⚡ Stay indoors, avoid trees and open spaces")
        if temp is not None and temp > 32:
            tips.append("🔥 Hydratez-vous et évitez le soleil direct" if lang == "fr" else "🔥 Hydrate and avoid direct sun")
        if wind is not None and wind > 9:
            tips.append("💨 Attention aux objets qui peuvent s'envoler" if lang == "fr" else "💨 Secure loose objects")
        if not tips:
            tips.append("✅ Conditions globalement sûres" if lang == "fr" else "✅ Generally safe conditions")
        return tips[:3]

    def get_outfit(self, temp, condition, lang="fr"):
        top = self.get_clothing(temp)[0] if self.get_clothing(temp) else ("👕 T-shirt" if lang=="fr" else "👕 T-shirt")
        acc = []
        c = (condition or "").lower()
        if "rain" in c or "drizzle" in c:
            acc.append("🧥 Veste imperméable")
        if "clear" in c and temp > 22:
            acc.append("😎 Lunettes")
        if temp < 12:
            acc.append("🧣 Écharpe")
        return {"main": top, "accessories": acc[:3]}

ai_engine = WeatherAI()

def get_ai_recommendations(temp, condition, wind, humidity, city, lang="fr", feels_like=None, hourly=None, uv_index=None, aqi=None, profile=None,
                            heure_locale=None, moment_journee=None, est_jour=None, lever_soleil=None, coucher_soleil=None,
                            pressure=None, cloud_cover=None, visibility=None):
    """Use Groq LLM for smart, natural language recommendations. Falls back to rule-based engine."""
    global ai_backoff_until
    
    # Always prepare a rich fallback context for the rule engine
    fallback_ctx = {
        "temperature": temp,
        "condition": condition,
        "vent": wind,
        "humidite": humidity,
        "hourly": hourly or [],
        "est_jour": est_jour,
        "moment_journee": moment_journee,
    }

    # Check recommendations cache
    cache_key = f"{city.lower()}_{temp}_{condition}_{wind}_{humidity}_{lang}"
    if cache_key in _recommendations_cache:
        cached_item = _recommendations_cache[cache_key]
        if (time.time() - cached_item["ts"]) < 600:
            print("[AI] Cache HIT for recommendations")
            return cached_item["data"]

    if not groq_client:
        return ai_engine.generate_recommendations(fallback_ctx, lang)

    # Check backoff if quota was exceeded
    if time.time() < ai_backoff_until:
        print("[AI] Rate limit / quota exceeded backoff active. Using rule-based recommendations.")
        return ai_engine.generate_recommendations(fallback_ctx, lang)

    lang_instruction = "Respond in French." if lang == "fr" else "Respond in English."

    extra_context = ""
    if feels_like is not None:
        extra_context += f"- Ressenti: {feels_like}°C\n"
    if uv_index is not None:
        extra_context += f"- Index UV: {uv_index}\n"
    if aqi is not None:
        extra_context += f"- Qualité de l'air (AQI): {aqi}\n"
    if hourly:
        sample = ", ".join([f"{h.get('heure','')} {h.get('temp','?')}°" for h in hourly[:5]])
        extra_context += f"- Aperçu prochaines heures: {sample}\n"
    if heure_locale is not None:
        day_night_label = "daytime" if est_jour else "nighttime"
        extra_context += f"- Local time in {city}: {heure_locale} ({moment_journee}, currently {day_night_label})\n"
    if lever_soleil is not None:
        extra_context += f"- Sunrise: {lever_soleil}, Sunset: {coucher_soleil}\n"
    if pressure is not None:
        extra_context += f"- Pressure: {pressure} hPa\n"
    if cloud_cover is not None:
        extra_context += f"- Cloud cover: {cloud_cover}%\n"
    if visibility is not None:
        extra_context += f"- Visibility: {visibility} km\n"

    profile_context = ""
    health_disclaimer = ""
    if profile:
        parts = []
        if profile.get("age"):
            parts.append(f"- Age: {profile['age']}")
        if profile.get("occupation"):
            parts.append(f"- Occupation: {profile['occupation']}")
        if profile.get("allergies"):
            parts.append(f"- Allergies / sensitivities: {profile['allergies']}")
        if profile.get("chronic_conditions"):
            parts.append(f"- Known conditions: {profile['chronic_conditions']}")
        if parts:
            profile_context = "User profile:\n" + "\n".join(parts) + "\n"
            health_disclaimer = (
                "IMPORTANT: When health-adjacent advice is triggered by profile data (e.g. allergies, chronic conditions), "
                "give only general precautionary guidance (e.g. 'high pollen today, consider limiting outdoor exposure'). "
                "Never provide a medical diagnosis or treatment recommendation. "
                "Append exactly this disclaimer on a new line after any health-related advice: "
                '"This is general guidance, not medical advice — consult a doctor for specific concerns." '
            )

    prompt = f"""
You are a helpful weather assistant for the app "Météo Express Pro".

Current conditions:
- City: {city}
- Temperature: {temp}°C
- Condition: {condition}
- Wind: {wind} m/s
- Humidity: {humidity}%
{extra_context}
{profile_context}
{health_disclaimer}
{lang_instruction}
IMPORTANT: Use the local time and day/night status above. Do not assume it is daytime — check "currently daytime/nighttime" explicitly. Tailor activity, clothing, and safety suggestions to the actual time of day (e.g. don't suggest a picnic or sunscreen at night; don't suggest stargazing at noon).

Provide ONLY a valid JSON object (no markdown, no extra text) with exactly these keys:
- "clothing": array of 3-5 specific clothing suggestions (plain text, in the response language, no emojis)
- "activities": object with "icon", "activities" (array of 4-5 suggestions), and optional "warning"
- "health": array of objects with "severity" (low/medium/high), "advice"
- "travel": short travel/driving advice string
- "summary": one friendly paragraph summary (2-3 sentences)
- "comfort_index": integer 30-95 based on temp and humidity
- "best_hours": array of 2-4 objects like {{"time": "14:00", "reason": "short reason in chosen language"}}
- "pack": array of 3-5 practical items to bring (plain text, language matching, no emojis)
- "safety_tips": array of 2-3 short actionable safety tips (language matching)
- "outfit": object with "main": "primary clothing suggestion", "accessories": array of 1-3 accessories

Be practical, friendly, concise and accurate. Base suggestions on the real conditions + hourly preview when given.
"""

    def _call_groq(model):
        """Call the Groq API with the given model."""
        response = groq_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1024,
            timeout=6.0
        )
        return response.choices[0].message.content.strip()

    try:
        # Try primary model first
        try:
            text = _call_groq(GROQ_PRIMARY_MODEL)
        except Exception as primary_err:
            err_msg = str(primary_err).lower()
            if "429" in err_msg or "rate" in err_msg or "limit" in err_msg:
                print(f"[AI] Primary model rate limited, trying fallback: {primary_err}")
                text = _call_groq(GROQ_FALLBACK_MODEL)
            else:
                raise primary_err

        # Clean possible ```json fences
        if text.startswith("```"):
            text = text.split("```")[1].strip()
            if text.lower().startswith("json"):
                text = text[4:].strip()
        data = json.loads(text)

        # Guarantee required + expanded keys have sane fallbacks
        if "comfort_index" not in data or not isinstance(data.get("comfort_index"), int):
            data["comfort_index"] = ai_engine._calculate_comfort_index(temp, humidity)
        for k in ["clothing", "activities", "health", "travel", "summary"]:
            if k not in data:
                # will be filled by fallback merge below if missing critical
                pass
        if "best_hours" not in data or not isinstance(data.get("best_hours"), list):
            data["best_hours"] = ai_engine.get_best_hours(hourly, condition, lang)
        if "pack" not in data or not isinstance(data.get("pack"), list):
            data["pack"] = ai_engine.get_pack_items(condition, lang)
        if "safety_tips" not in data or not isinstance(data.get("safety_tips"), list):
            data["safety_tips"] = ai_engine.get_safety_tips(condition, temp, wind, lang)
        if "outfit" not in data or not isinstance(data.get("outfit"), dict):
            data["outfit"] = ai_engine.get_outfit(temp, condition, lang)

        # Cache recommendations
        _recommendations_cache[cache_key] = {"data": data, "ts": time.time()}
        return data
    except Exception as e:
        print(f"[AI] Error: {e}")
        # If we hit a rate limit (429) or quota error, activate backoff for 5 minutes
        err_msg = str(e).lower()
        if "429" in err_msg or "quota" in err_msg or "limit" in err_msg:
            ai_backoff_until = time.time() + 300
            print("[AI] Rate limit / quota error detected. Activating backoff for 5 minutes.")
            
        # Fallback to rich rule-based
        return ai_engine.generate_recommendations(fallback_ctx, lang)


def stream_recommendation(city, weather_summary, lang="fr", profile=None,
                          heure_locale=None, moment_journee=None, est_jour=None,
                          lever_soleil=None, coucher_soleil=None, pressure=None,
                          cloud_cover=None, visibility=None):
    """Stream AI recommendations from Groq as SSE text chunks.

    Yields Server-Sent Event formatted strings (``data: <text>\\n\\n``).
    The final event is ``data: [DONE]\\n\\n``.

    If the Groq client is unavailable the function yields a single
    rule-based fallback paragraph and finishes.
    """

    # --- Fallback: no Groq client available ---
    if not groq_client:
        if lang == "fr":
            yield "data: Recommandations IA temporairement indisponibles. Consultez les données météo ci-dessus.\n\n"
        else:
            yield "data: AI recommendations temporarily unavailable. Please check the weather data above.\n\n"
        yield "data: [DONE]\n\n"
        return

    lang_instruction = "Réponds en français." if lang == "fr" else "Respond in English."

    extra_context = ""
    if heure_locale is not None:
        day_night_label = "daytime" if est_jour else "nighttime"
        extra_context += f"- Local time in {city}: {heure_locale} ({moment_journee}, currently {day_night_label})\n"
    if lever_soleil is not None:
        extra_context += f"- Sunrise: {lever_soleil}, Sunset: {coucher_soleil}\n"
    if pressure is not None:
        extra_context += f"- Pressure: {pressure} hPa\n"
    if cloud_cover is not None:
        extra_context += f"- Cloud cover: {cloud_cover}%\n"
    if visibility is not None:
        extra_context += f"- Visibility: {visibility} km\n"

    profile_context = ""
    health_disclaimer = ""
    if profile:
        parts = []
        if profile.get("age"):
            parts.append(f"- Age: {profile['age']}")
        if profile.get("occupation"):
            parts.append(f"- Occupation: {profile['occupation']}")
        if profile.get("allergies"):
            parts.append(f"- Allergies / sensitivities: {profile['allergies']}")
        if profile.get("chronic_conditions"):
            parts.append(f"- Known conditions: {profile['chronic_conditions']}")
        if parts:
            profile_context = "User profile:\n" + "\n".join(parts) + "\n"
            health_disclaimer = (
                "IMPORTANT: When health-related advice is triggered by profile data, "
                "give only general precautionary guidance. "
                "Never provide a medical diagnosis. "
                "Append this disclaimer after any health advice: "
                '"This is general guidance, not medical advice — consult a doctor for specific concerns." '
            )

    prompt = f"""You are a friendly weather assistant for the app "Météo Express Pro".

Current conditions for {city}:
{weather_summary}
{extra_context}
{profile_context}
{health_disclaimer}
{lang_instruction}
IMPORTANT: Use the local time and day/night status above. Do not assume it is daytime — check "currently daytime/nighttime" explicitly. Tailor activity, clothing, and safety suggestions to the actual time of day (e.g. don't suggest a picnic or sunscreen at night; don't suggest stargazing at noon).

Respond only with a valid JSON object. No markdown, no explanation, no text outside the JSON.
The object must have exactly these fields:
- "clothing": array of 3-5 short clothing suggestions (plain text, no emojis)
- "activities": object with "icon" (short single-word activity keyword like running/cycling/swimming) and "activities" (array of 3-5 short activity strings, no emojis)
- "travel": short driving/travel advice string (plain text, no emoji)
- "pack": array of 3-5 practical items to bring (plain text, no emojis)
- "comfort_index": integer between 30 and 95 based on temperature and humidity
- "summary": one friendly sentence summarizing the day"""

    if profile_context.strip():
        prompt += """
- "personalized_advice": array of 1-3 short personalized tips based on the user profile (e.g. pollen allergy warning, cold sensitivity for older age, heat caution for specific occupations). If the profile has allergies, suggest limiting outdoor exposure when conditions might trigger them. If age is given, adapt the advice accordingly. Never give medical advice."""

    prompt += """

Example:
{{"clothing":["👕 T-shirt léger","🩳 Short","😎 Lunettes de soleil","👒 Chapeau"],"activities":{{"icon":"🏃","activities":["Promenade matinale","Détente à l'ombre","Visite de marché","Sport en extérieur"]}},"travel":"🚗 Évitez les déplacements aux heures les plus chaudes.","pack":["💧 Bouteille d'eau","🧴 Écran solaire","😎 Lunettes","👒 Chapeau"],"comfort_index":75,"summary":"Protégez-vous du soleil et restez hydraté pour profiter de votre journée."}}"""

    def _stream_groq(model):
        """Yield text chunks from a streaming Groq completion."""
        response = groq_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            temperature=0.7,
            max_tokens=1024,
        )
        for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                # Escape newlines for SSE (each data: line is one event)
                text = delta.content.replace("\n", "\ndata: ")
                yield f"data: {text}\n\n"

    try:
        # Try primary model first
        try:
            yield from _stream_groq(GROQ_PRIMARY_MODEL)
        except Exception as primary_err:
            err_msg = str(primary_err).lower()
            if "429" in err_msg or "rate" in err_msg or "limit" in err_msg:
                print(f"[AI Stream] Primary model rate limited, trying fallback: {primary_err}")
                yield from _stream_groq(GROQ_FALLBACK_MODEL)
            else:
                raise primary_err
    except Exception as e:
        print(f"[AI Stream] Error: {e}")
        fallback = "Recommandations temporairement indisponibles." if lang == "fr" else "Recommendations temporarily unavailable."
        yield f"data: {fallback}\n\n"

    yield "data: [DONE]\n\n"
