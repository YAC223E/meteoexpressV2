import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ==================== API KEYS ====================
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

if not OPENWEATHER_API_KEY:
    raise ValueError("OPENWEATHER_API_KEY is missing from environment variables. Check your .env file.")

# ==================== API URLS ====================
BASE_URL    = "https://api.openweathermap.org/data/2.5"
GEO_URL     = "https://api.openweathermap.org/geo/1.0"
AIR_URL     = "https://api.openweathermap.org/data/2.5/air_pollution"
ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall"

# ==================== CACHE SETTINGS ====================
CACHE_TTL = 600  # 10 minutes
TILE_CACHE_TTL = 1800  # 30 minutes

# ==================== CONSTANTS ====================
# Weather-condition visuals are now SVG-based: see backend/icon_map.py
# (WEATHER_ICON_SVG + weather_icon_path()). No emoji mapping remains here.

# ==================== AUTH SETTINGS ====================
AUTH_SECRET_KEY = os.environ.get("AUTH_SECRET_KEY", "change-me-in-production-meteoexpress-secret-key-2024")

# ==================== AI MODEL SETTINGS ====================
GROQ_PRIMARY_MODEL = "llama-3.3-70b-versatile"
GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant"
