import os
import logging
import threading
import time
import unicodedata
import requests
from collections import OrderedDict
from dotenv import load_dotenv

load_dotenv()

LOGGER = logging.getLogger(__name__)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
REVERSE_GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse"
REVERSE_GEOCODE_CACHE = OrderedDict()
WEATHER_CACHE = OrderedDict()
WEATHER_CACHE_LOCK = threading.Lock()
WEATHER_CACHE_TTL_SECONDS = 300
REVERSE_GEOCODE_CACHE_LIMIT = 2048
WEATHER_CACHE_LIMIT = 512


def is_latin_location_name(value):
    """Return True only when every letter uses the Latin script."""
    if not isinstance(value, str) or not value.strip():
        return False

    has_letter = False
    for character in value.strip():
        if character.isalpha():
            has_letter = True
            if "LATIN" not in unicodedata.name(character, ""):
                return False
    return has_letter


def _first_latin_name(values):
    for value in values:
        if is_latin_location_name(value):
            return value.strip()
    return None


def _resolve_latin_location_name(result):
    """Select a provider-supplied English/Latin locality or region name."""
    namedetails = result.get("namedetails") or {}
    preferred_keys = (
        "name:en",
        "official_name:en",
        "alt_name:en",
        "short_name:en",
        "loc_name:en",
        "old_name:en",
        "name:latin",
        "official_name:latin",
        "name:ascii"
    )
    preferred_values = [namedetails.get(key) for key in preferred_keys]
    preferred_values.extend(
        value
        for key, value in namedetails.items()
        if key.endswith(":en") and key not in preferred_keys
    )

    address = result.get("address") or {}
    address_values = [
        address.get("city"),
        address.get("town"),
        address.get("village"),
        address.get("municipality"),
        address.get("county"),
        address.get("state_district"),
        address.get("state"),
        address.get("region")
    ]

    return _first_latin_name(
        preferred_values
        + address_values
        + [result.get("name")]
    )


def get_location_name(lat, lon):
    """Return a cached locality name for sampled route coordinates."""
    if lat is None or lon is None:
        return None

    cache_key = (round(float(lat), 4), round(float(lon), 4))
    with WEATHER_CACHE_LOCK:
        if cache_key in REVERSE_GEOCODE_CACHE:
            REVERSE_GEOCODE_CACHE.move_to_end(cache_key)
            return REVERSE_GEOCODE_CACHE[cache_key]

    try:
        response = requests.get(
            REVERSE_GEOCODE_URL,
            params={
                "lat": cache_key[0],
                "lon": cache_key[1],
                "format": "jsonv2",
                "zoom": 18,
                "addressdetails": 1,
                "namedetails": 1
            },
            headers={
                "User-Agent": "NER-SmartRoute/1.0 (route-weather-location)"
            },
            timeout=5
        )
        response.raise_for_status()
        result = response.json()
        location_name = _resolve_latin_location_name(result)
    except Exception as error:
        location_name = None
        LOGGER.warning(
            "Reverse geocoding failed for %.4f, %.4f: %s",
            cache_key[0],
            cache_key[1],
            error
        )

    with WEATHER_CACHE_LOCK:
        REVERSE_GEOCODE_CACHE[cache_key] = location_name
        REVERSE_GEOCODE_CACHE.move_to_end(cache_key)
        while len(REVERSE_GEOCODE_CACHE) > REVERSE_GEOCODE_CACHE_LIMIT:
            REVERSE_GEOCODE_CACHE.popitem(last=False)
    return location_name


def get_current_weather(lat, lon):
    if not OPENWEATHER_API_KEY:
        raise RuntimeError("OPENWEATHER_API_KEY is not configured")

    cache_key = (round(float(lat), 4), round(float(lon), 4))
    current_time = time.monotonic()
    with WEATHER_CACHE_LOCK:
        cached = WEATHER_CACHE.get(cache_key)
        if cached and current_time - cached[0] < WEATHER_CACHE_TTL_SECONDS:
            WEATHER_CACHE.move_to_end(cache_key)
            return dict(cached[1])
        if cached:
            WEATHER_CACHE.pop(cache_key, None)

    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }

    response = requests.get(
        BASE_URL,
        params=params,
        timeout=10
    )

    response.raise_for_status()

    data = response.json()

    weather_info = data.get("weather", [{}])[0]
    main_info = data.get("main", {})
    wind_info = data.get("wind", {})
    rain_info = data.get("rain", {})

    result = {
        "latitude": lat,
        "longitude": lon,
        "temperature_c": main_info.get("temp"),
        "humidity": main_info.get("humidity"),
        "wind_speed": wind_info.get("speed"),
        "weather": weather_info.get("main"),
        "description": weather_info.get("description"),
        "rain_1h": rain_info.get("1h", 0),
    }

    with WEATHER_CACHE_LOCK:
        WEATHER_CACHE[cache_key] = (current_time, result)
        WEATHER_CACHE.move_to_end(cache_key)
        while len(WEATHER_CACHE) > WEATHER_CACHE_LIMIT:
            WEATHER_CACHE.popitem(last=False)
    return dict(result)