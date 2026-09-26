# =========================================================
# NER SMARTROUTE - FASTAPI BACKEND
# =========================================================

import logging
import math
import os
import secrets
import time
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from route_optimization import (
    DEFAULT_VEHICLE_TYPE,
    G,
    STATE_COORDINATES,
    VEHICLE_TYPES,
    find_meaningful_routes,
    normalize_state
)
from community_hazards import (
    HAZARD_TYPES,
    create_report,
    get_photo_path,
    list_reports,
    update_status
)
from weather_service import get_current_weather


LOGGER = logging.getLogger(__name__)
HAZARD_REVIEW_TOKEN = os.getenv("HAZARD_REVIEW_TOKEN")


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
    started = time.perf_counter()
    try:
        return get_current_weather(lat, lon)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        LOGGER.info("Weather request completed in %.1f ms", (time.perf_counter() - started) * 1000)


@app.get("/community-hazards")
def get_community_hazards():
    started = time.perf_counter()
    reports = list_reports()
    LOGGER.info(
        "Community reports loaded in %.1f ms (%s reports)",
        (time.perf_counter() - started) * 1000,
        len(reports)
    )
    return {"reports": reports, "hazard_types": HAZARD_TYPES}


@app.post("/community-hazards")
async def submit_community_hazard(request: Request):
    try:
        report = create_report(await request.json())
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return report


@app.get("/community-hazards/{report_id}/photo")
def get_community_hazard_photo(report_id: str):
    path, media_type = get_photo_path(report_id)
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="Hazard photo not found.")
    return Response(content=path.read_bytes(), media_type=media_type)


@app.post("/community-hazards/{report_id}/status")
async def set_community_hazard_status(report_id: str, request: Request):
    supplied_token = request.headers.get("X-Hazard-Review-Token", "")
    if not HAZARD_REVIEW_TOKEN or not secrets.compare_digest(supplied_token, HAZARD_REVIEW_TOKEN):
        raise HTTPException(status_code=403, detail="Hazard review authorization is required.")
    try:
        payload = await request.json()
        if not isinstance(payload, dict):
            raise ValueError("A JSON status object is required.")
        report = update_status(report_id, payload.get("status"))
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if report is None:
        raise HTTPException(status_code=404, detail="Hazard report not found.")
    return report


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


def _distance_to_route_km(latitude, longitude, coordinates):
    if len(coordinates) < 2:
        return float("inf")

    cosine = math.cos(math.radians(latitude))
    point_x = longitude * cosine * 111.32
    point_y = latitude * 110.57
    closest_distance = float("inf")

    for first, second in zip(coordinates, coordinates[1:]):
        first_x = first[0] * cosine * 111.32
        first_y = first[1] * 110.57
        second_x = second[0] * cosine * 111.32
        second_y = second[1] * 110.57
        segment_x = second_x - first_x
        segment_y = second_y - first_y
        segment_length_squared = segment_x ** 2 + segment_y ** 2
        if segment_length_squared == 0:
            fraction = 0.0
        else:
            fraction = max(
                0.0,
                min(
                    1.0,
                    ((point_x - first_x) * segment_x + (point_y - first_y) * segment_y)
                    / segment_length_squared
                )
            )
        nearest_x = first_x + fraction * segment_x
        nearest_y = first_y + fraction * segment_y
        closest_distance = min(
            closest_distance,
            math.hypot(point_x - nearest_x, point_y - nearest_y)
        )

    return closest_distance


def _attach_community_alerts(routes, reports):
    for route in routes:
        coordinates = route.get("geometry", {}).get("coordinates", [])
        nearby_reports = []
        for report in reports:
            if report.get("status") == "Resolved":
                continue
            distance = _distance_to_route_km(
                float(report["latitude"]),
                float(report["longitude"]),
                coordinates
            )
            if distance <= 0.3:
                nearby_reports.append({
                    "report_id": report["report_id"],
                    "hazard_type": report["hazard_type"],
                    "description": report["description"],
                    "reported_at": report["reported_at"],
                    "status": report["status"],
                    "severity": report["severity"],
                    "verified": report.get("verified", False),
                    "latitude": report["latitude"],
                    "longitude": report["longitude"],
                    "distance_km": round(distance, 2)
                })

        active_reports = [report for report in nearby_reports if report["status"] == "Active"]
        blocking_reports = [
            report for report in active_reports
            if report["hazard_type"] == "Road blockage"
        ]
        route["community_alerts"] = nearby_reports
        route["community_alert_count"] = len(nearby_reports)
        route["active_hazard_count"] = len(active_reports)
        route["not_recommended"] = bool(blocking_reports)
        route["recommendation_status"] = (
            "NOT RECOMMENDED — ACTIVE HAZARD"
            if blocking_reports
            else "RECOMMENDED"
            if route.get("is_recommended")
            else "ALTERNATIVE"
        )
        route["hazard_warning"] = (
            f"ACTIVE {active_reports[0]['hazard_type'].upper()}. "
            "This route contains an active community hazard report."
            if active_reports
            else None
        )


def _choose_hazard_aware_route(routes, previous_recommendation):
    available_routes = [route for route in routes if not route["not_recommended"]]
    candidates = available_routes or routes
    if not candidates:
        return None

    hazard_free_routes = [route for route in candidates if route["active_hazard_count"] == 0]
    if hazard_free_routes:
        candidates = hazard_free_routes
    elif previous_recommendation in candidates:
        candidates = [previous_recommendation]

    return max(
        candidates,
        key=lambda route: (route["safety_score"], -route["distance_km"])
    )


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
    request_started = time.perf_counter()

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

    previous_recommendation = next(
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

    community_started = time.perf_counter()
    reports = list_reports()
    _attach_community_alerts(routes, reports)
    recommended_route = _choose_hazard_aware_route(routes, previous_recommendation)
    for route in routes:
        route["is_recommended"] = route is recommended_route and not route["not_recommended"]
        route["recommendation_status"] = (
            "NOT RECOMMENDED — ACTIVE HAZARD"
            if route["not_recommended"]
            else "RECOMMENDED"
            if route["is_recommended"]
            else "ALTERNATIVE"
        )
        route["labels"] = [label for label in route.get("labels", []) if label != "RECOMMENDED"]
        if route["is_recommended"]:
            route["labels"].append("RECOMMENDED")
            route["recommendation"] = "RECOMMENDED"
        elif route["not_recommended"]:
            route["recommendation"] = route["recommendation_status"]

    LOGGER.info(
        "Community report matching completed in %.1f ms (%s reports)",
        (time.perf_counter() - community_started) * 1000,
        len(reports)
    )

    LOGGER.info(
        "Route response diagnostics: meaningful_generated=%s routes_returned=%s",
        len(routes),
        len(routes)
    )
    LOGGER.info(
        "Total /get_route response preparation completed in %.1f ms",
        (time.perf_counter() - request_started) * 1000
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

        "vehicle_suitability_note": (
            "Vehicle suitability estimated from available road and risk data; "
            "the GIS dataset contains no vehicle restriction fields."
        ),

        "community_alert_count": sum(
            route["community_alert_count"] for route in routes
        ),

        "weather_loaded_separately": True,

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