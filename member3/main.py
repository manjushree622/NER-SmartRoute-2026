# =========================================================
# NER SMARTROUTE - FASTAPI BACKEND
# =========================================================

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from route_optimization import (
    G,
    normalize_state,
    safest_route,
    alternate_route
)


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
    )
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


    # -----------------------------------------------------
    # CALCULATE SAFEST ROUTE
    # -----------------------------------------------------

    recommended_route = safest_route(
        G,
        normalized_source,
        normalized_target
    )


    # -----------------------------------------------------
    # CHECK RECOMMENDED ROUTE ERROR
    # -----------------------------------------------------

    if (
        recommended_route is None
        or "error" in recommended_route
    ):

        return {
            "success": False,

            "error": (
                recommended_route.get(
                    "error",
                    "Unable to calculate safest route."
                )
                if recommended_route
                else
                "Unable to calculate safest route."
            )
        }


    # -----------------------------------------------------
    # CALCULATE ALTERNATE ROUTE
    # -----------------------------------------------------

    alternative_route = alternate_route(
        G,
        normalized_source,
        normalized_target
    )


    # -----------------------------------------------------
    # CHECK ALTERNATE ROUTE ERROR
    # -----------------------------------------------------

    if (
        alternative_route is None
        or "error" in alternative_route
    ):

        return {
            "success": False,

            "error": (
                alternative_route.get(
                    "error",
                    "Unable to calculate alternate route."
                )
                if alternative_route
                else
                "Unable to calculate alternate route."
            )
        }


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

        "alternate_route":
            alternative_route,

        "routes": [
            recommended_route,
            alternative_route
        ],

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
                "green",

            "alternate_route_color":
                "red"
        },

        "message":
            (
                "Safest route recommended based on "
                "environmental and disaster-risk factors."
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
