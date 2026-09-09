# =========================================================
# NER SMARTROUTE - FASTAPI BACKEND
# =========================================================

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging
from weather_service import get_current_weather
from fastapi import FastAPI, HTTPException
from route_optimization import (
    G,
    normalize_state,
    find_meaningful_routes,
    DEFAULT_VEHICLE_TYPE,
    VEHICLE_TYPES
)


LOGGER = logging.getLogger(__name__)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="NER SmartRoute API",
    description=(
        "AI-based disaster-aware safest route "
        "optimization system for North Eastern India."
    ),
    version="1.0.0"
)
@app.get("/weather")
def weather(lat: float, lon: float):
    try:
        return get_current_weather(lat, lon)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# SUPPORTED LOCATIONS
# =========================================================

SUPPORTED_LOCATIONS = [
    "Assam",
    "Arunachal Pradesh",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Sikkim",
    "Tripura",
    "West Tripura"
]


# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():

    return {
        "success": True,

        "message":
            "NER SmartRoute API is running.",

        "project":
            "NER SmartRoute",

        "version":
            "1.0.0",

        "description":
            "Disaster-aware safest route "
            "optimization for North Eastern India.",

        "features": [
            "Safest route recommendation",
            "Alternate route",
            "Risk analysis",
            "Rainfall analysis",
            "Slope analysis",
            "Landslide risk analysis",
            "Distance calculation",
            "Travel time estimation",
            "GeoJSON route geometry",
            "Capital-based location input"
        ],

        "endpoint":
            "/get_route"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():

    return {
        "success": True,
        "status": "healthy",
        "service": "NER SmartRoute API"
    }


# =========================================================
# SUPPORTED LOCATIONS
# =========================================================

@app.get("/locations")
def get_supported_locations():

    return {
        "success": True,
        "locations": SUPPORTED_LOCATIONS,
        "count": len(SUPPORTED_LOCATIONS)
    }


# =========================================================
# GET ROUTE
# =========================================================

@app.get("/get_route")
def get_route(
    source: str = Query(
        ...,
        description=(
            "Source state or supported capital"
        )
    ),

    target: str = Query(
        ...,
        description=(
            "Destination state or supported capital"
        )
    ),

    vehicle_type: Optional[str] = Query(
        None,
        description="Optional vehicle type for route planning"
    ),

):

    # -----------------------------------------------------
    # NORMALIZE INPUT
    # -----------------------------------------------------

    normalized_source = normalize_state(source)
    normalized_target = normalize_state(target)


    # -----------------------------------------------------
    # VALIDATE SOURCE
    # -----------------------------------------------------

    if normalized_source not in SUPPORTED_LOCATIONS:

        return {
            "success": False,

            "error": (
                f"Unsupported source: {source}. "
                "Supported locations are: "
                + ", ".join(SUPPORTED_LOCATIONS)
            )
        }


    # -----------------------------------------------------
    # VALIDATE DESTINATION
    # -----------------------------------------------------

    if normalized_target not in SUPPORTED_LOCATIONS:

        return {
            "success": False,

            "error": (
                f"Unsupported destination: {target}. "
                "Supported locations are: "
                + ", ".join(SUPPORTED_LOCATIONS)
            )
        }


    # -----------------------------------------------------
    # SAME SOURCE AND DESTINATION
    # -----------------------------------------------------

    if normalized_source == normalized_target:

        return {
            "success": False,

            "error": (
                "Source and destination cannot "
                "be the same."
            )
        }

    selected_vehicle = vehicle_type if vehicle_type in VEHICLE_TYPES else DEFAULT_VEHICLE_TYPE

    routes = find_meaningful_routes(
        G,
        normalized_source,
        normalized_target,
        vehicle_type=selected_vehicle
    )

    if isinstance(routes, dict) and "error" in routes:

        return {
            "success": False,
            "error": routes["error"]
        }

    recommended_route = next(
        (route for route in routes if route.get("is_recommended")),
        routes[0] if routes else None
    )
    shortest_route = next(
        (route for route in routes if route.get("is_shortest")),
        None
    )
    safest_route = next(
        (route for route in routes if route.get("is_safest")),
        None
    )
    LOGGER.info(
        "Route response diagnostics: meaningful_generated=%s routes_returned=%s",
        len(routes),
        len(routes)
    )


    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {

        "success": True,

        "source":
            normalized_source,

        "target":
            normalized_target,

        "recommended_route":
            recommended_route,

        "shortest_route":
            shortest_route,

        "safest_route":
            safest_route,

        "routes": [
            *routes
        ],

        "route_count": len(routes),
        "vehicle_type": selected_vehicle,

        "multiple_routes_available": len(routes) > 1,

        "navigation_enabled":
            True,

        "recommendation_basis": [

            "Risk probability",

            "Overall risk level",

            "Rainfall",

            "Slope",

            "Landslide risk",

            "Route distance"
        ],

        "map_data": {

            "geometry_format":
                "GeoJSON LineString",

            "coordinate_order":
                "[longitude, latitude]",

            "recommended_route_color":
                "safety-score based",

            "route_colors":
                "safety-score based"
        },

        "message":
            (
                "Recommended route selected by balancing GIS distance, "
                "travel time and environmental safety."
            )
    }


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )