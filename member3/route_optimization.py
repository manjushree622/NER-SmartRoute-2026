# =========================================================
# NER SMARTROUTE - ROUTE OPTIMIZATION
# =========================================================

import pandas as pd
import networkx as nx


# =========================================================
# LOAD DATASETS
# =========================================================

try:
    rainfall_slope_df = pd.read_csv(
        "member6_ml_ready_with_slope.csv"
    )
except Exception:
    rainfall_slope_df = pd.DataFrame()


try:
    district_risk_df = pd.read_csv(
        "district_risk_predictions.csv"
    )
except Exception:
    district_risk_df = pd.DataFrame()


# =========================================================
# STATE COORDINATES
# Format: latitude, longitude
# =========================================================

STATE_COORDINATES = {
    "Assam": (26.1445, 91.7362),
    "Arunachal Pradesh": (27.0844, 93.6053),
    "Manipur": (24.8170, 93.9368),
    "Meghalaya": (25.5788, 91.8933),
    "Mizoram": (23.7271, 92.7176),
    "Nagaland": (25.6751, 94.1086),
    "Sikkim": (27.3389, 88.6065),
    "Tripura": (23.8315, 91.2868),
    "West Tripura": (23.8315, 91.2868)
}


# =========================================================
# STATE CAPITALS
# =========================================================

STATE_CAPITALS = {
    "Assam": "Guwahati",
    "Arunachal Pradesh": "Itanagar",
    "Manipur": "Imphal",
    "Meghalaya": "Shillong",
    "Mizoram": "Aizawl",
    "Nagaland": "Kohima",
    "Sikkim": "Gangtok",
    "Tripura": "Agartala",
    "West Tripura": "Agartala"
}


# =========================================================
# CAPITAL / STATE ALIASES
# =========================================================

LOCATION_ALIASES = {
    "guwahati": "Assam",
    "assam": "Assam",

    "itanagar": "Arunachal Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "arunachal": "Arunachal Pradesh",

    "imphal": "Manipur",
    "manipur": "Manipur",

    "shillong": "Meghalaya",
    "meghalaya": "Meghalaya",

    "aizawl": "Mizoram",
    "mizoram": "Mizoram",

    "kohima": "Nagaland",
    "nagaland": "Nagaland",

    "gangtok": "Sikkim",
    "sikkim": "Sikkim",

    "agartala": "Tripura",
    "tripura": "Tripura",

    "west tripura": "West Tripura"
}


# =========================================================
# NORMALIZE LOCATION
# =========================================================

def normalize_state(location):
    """
    Converts state/capital input into standard state name.
    """

    if location is None:
        return None

    location = str(location).strip().lower()

    return LOCATION_ALIASES.get(location)


# =========================================================
# ROUTE GRAPH
# =========================================================

G = nx.Graph()

for state in STATE_COORDINATES:
    G.add_node(state)


# =========================================================
# DEMO ROUTE DISTANCES
# =========================================================

ROUTE_DISTANCES = {

    ("Assam", "Tripura"): 527,

    ("Manipur", "Mizoram"): 500,

    ("Arunachal Pradesh", "Meghalaya"): 765,

    ("Sikkim", "Nagaland"): 1065,

    ("Assam", "West Tripura"): 511,

    ("Meghalaya", "Assam"): 103,

    ("Nagaland", "Manipur"): 145,

    ("Mizoram", "Tripura"): 355,

    ("Sikkim", "Assam"): 520,

    ("Arunachal Pradesh", "Nagaland"): 315
}


# =========================================================
# ADD ROUTES TO GRAPH
# =========================================================

for (source, target), distance in ROUTE_DISTANCES.items():

    G.add_edge(
        source,
        target,
        distance_km=distance
    )


# =========================================================
# RISK DATA
# =========================================================

RISK_DATA = {

    ("Assam", "Tripura"): {
        "rainfall_risk": "Medium",
        "slope_risk": "Low",
        "landslide_risk": "Low",
        "risk_level": "LOW",
        "risk_probability": 25
    },

    ("Manipur", "Mizoram"): {
        "rainfall_risk": "Medium",
        "slope_risk": "Medium",
        "landslide_risk": "Medium",
        "risk_level": "MEDIUM",
        "risk_probability": 48
    },

    ("Arunachal Pradesh", "Meghalaya"): {
        "rainfall_risk": "High",
        "slope_risk": "High",
        "landslide_risk": "High",
        "risk_level": "HIGH",
        "risk_probability": 82
    },

    ("Sikkim", "Nagaland"): {
        "rainfall_risk": "Medium",
        "slope_risk": "High",
        "landslide_risk": "High",
        "risk_level": "HIGH",
        "risk_probability": 76
    },

    ("Assam", "West Tripura"): {
        "rainfall_risk": "Medium",
        "slope_risk": "Low",
        "landslide_risk": "Low",
        "risk_level": "LOW",
        "risk_probability": 28
    },

    ("Meghalaya", "Assam"): {
        "rainfall_risk": "High",
        "slope_risk": "Medium",
        "landslide_risk": "Medium",
        "risk_level": "MEDIUM",
        "risk_probability": 55
    },

    ("Nagaland", "Manipur"): {
        "rainfall_risk": "Medium",
        "slope_risk": "Medium",
        "landslide_risk": "Medium",
        "risk_level": "MEDIUM",
        "risk_probability": 51
    },

    ("Mizoram", "Tripura"): {
        "rainfall_risk": "High",
        "slope_risk": "High",
        "landslide_risk": "Medium",
        "risk_level": "HIGH",
        "risk_probability": 71
    },

    ("Sikkim", "Assam"): {
        "rainfall_risk": "Medium",
        "slope_risk": "High",
        "landslide_risk": "Medium",
        "risk_level": "HIGH",
        "risk_probability": 68
    },

    ("Arunachal Pradesh", "Nagaland"): {
        "rainfall_risk": "High",
        "slope_risk": "High",
        "landslide_risk": "Medium",
        "risk_level": "HIGH",
        "risk_probability": 73
    }
}


# =========================================================
# ALTERNATE ROUTE WAYPOINTS
# Format: longitude, latitude
# =========================================================

ALTERNATE_WAYPOINTS = {

    ("Assam", "Tripura"):
        [91.20, 25.10],

    ("Manipur", "Mizoram"):
        [93.20, 24.20],

    ("Arunachal Pradesh", "Meghalaya"):
        [92.70, 26.20],

    ("Sikkim", "Nagaland"):
        [91.80, 26.80],

    ("Assam", "West Tripura"):
        [91.00, 25.00],

    ("Meghalaya", "Assam"):
        [91.50, 25.90],

    ("Nagaland", "Manipur"):
        [94.00, 25.10],

    ("Mizoram", "Tripura"):
        [92.00, 23.50],

    ("Sikkim", "Assam"):
        [90.80, 26.80],

    ("Arunachal Pradesh", "Nagaland"):
        [93.80, 26.50]
}


# =========================================================
# RISK PRIORITY
# =========================================================

RISK_PRIORITY = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3
}


# =========================================================
# GET DISTANCE
# =========================================================

def get_distance(source, target):

    if (source, target) in ROUTE_DISTANCES:
        return ROUTE_DISTANCES[(source, target)]

    if (target, source) in ROUTE_DISTANCES:
        return ROUTE_DISTANCES[(target, source)]

    return None


# =========================================================
# GET RISK
# =========================================================

def get_risk(source, target):

    if (source, target) in RISK_DATA:
        return RISK_DATA[(source, target)]

    if (target, source) in RISK_DATA:
        return RISK_DATA[(target, source)]

    return {
        "rainfall_risk": "Medium",
        "slope_risk": "Medium",
        "landslide_risk": "Medium",
        "risk_level": "MEDIUM",
        "risk_probability": 50
    }


# =========================================================
# TRAVEL TIME
# =========================================================

def calculate_travel_time(
    distance_km,
    average_speed_kmh=45
):

    return round(
        (distance_km / average_speed_kmh) * 60,
        1
    )


# =========================================================
# FORMAT TRAVEL TIME
# =========================================================

def format_travel_time(minutes):

    if minutes is None:
        return "N/A"

    hours = int(minutes // 60)

    remaining_minutes = int(
        round(minutes % 60)
    )

    if remaining_minutes == 60:
        hours += 1
        remaining_minutes = 0

    if hours > 0:

        if remaining_minutes > 0:
            return (
                f"{hours} hr "
                f"{remaining_minutes} min"
            )

        return f"{hours} hr"

    return f"{remaining_minutes} min"


# =========================================================
# CREATE PRIMARY GEOMETRY
# =========================================================

def create_primary_geometry(
    source,
    target
):

    source_lat, source_lon = STATE_COORDINATES[source]

    target_lat, target_lon = STATE_COORDINATES[target]

    return [
        [source_lon, source_lat],
        [target_lon, target_lat]
    ]


# =========================================================
# CREATE ALTERNATE GEOMETRY
# =========================================================

def create_alternate_geometry(
    source,
    target
):

    source_lat, source_lon = STATE_COORDINATES[source]

    target_lat, target_lon = STATE_COORDINATES[target]

    waypoint = ALTERNATE_WAYPOINTS.get(
        (source, target)
    )

    if waypoint is None:

        waypoint = ALTERNATE_WAYPOINTS.get(
            (target, source)
        )

    if waypoint is None:

        waypoint = [
            (source_lon + target_lon) / 2 + 0.2,
            (source_lat + target_lat) / 2 + 0.2
        ]

    return [
        [source_lon, source_lat],
        waypoint,
        [target_lon, target_lat]
    ]


# =========================================================
# CREATE RISK REASON
# =========================================================

def create_reason(risk):

    reasons = []

    if risk["rainfall_risk"] == "High":
        reasons.append(
            "high rainfall risk"
        )

    elif risk["rainfall_risk"] == "Medium":
        reasons.append(
            "moderate rainfall risk"
        )

    if risk["slope_risk"] == "High":
        reasons.append(
            "steep terrain"
        )

    elif risk["slope_risk"] == "Medium":
        reasons.append(
            "moderate slope conditions"
        )

    if risk["landslide_risk"] == "High":
        reasons.append(
            "high landslide risk"
        )

    elif risk["landslide_risk"] == "Medium":
        reasons.append(
            "moderate landslide risk"
        )

    if not reasons:
        return (
            "Lower environmental risk based on "
            "available rainfall, slope and "
            "landslide factors."
        )

    return (
        "Route risk is influenced by "
        + ", ".join(reasons)
        + "."
    )


# =========================================================
# BUILD PRIMARY ROUTE
# =========================================================

def build_primary_route(
    graph,
    source,
    target
):

    distance = get_distance(
        source,
        target
    )

    if distance is None:

        return {
            "error":
                "No route available between "
                f"{source} and {target}."
        }

    risk = get_risk(
        source,
        target
    )

    average_speed = 45

    travel_time_min = calculate_travel_time(
        distance,
        average_speed
    )

    geometry = create_primary_geometry(
        source,
        target
    )

    return {

        "route_type": "Primary",

        "source": source,

        "target": target,

        "source_capital":
            STATE_CAPITALS.get(source),

        "target_capital":
            STATE_CAPITALS.get(target),

        "distance_km": distance,

        "average_speed_kmh":
            average_speed,

        "travel_time_min":
            travel_time_min,

        "travel_time":
            format_travel_time(
                travel_time_min
            ),

        "rainfall_risk":
            risk["rainfall_risk"],

        "slope_risk":
            risk["slope_risk"],

        "landslide_risk":
            risk["landslide_risk"],

        "risk_level":
            risk["risk_level"],

        "risk_probability":
            risk["risk_probability"],

        "risk_reason":
            create_reason(risk),

        "geometry": {

            "type": "LineString",

            "coordinates": geometry
        }
    }


# =========================================================
# BUILD ALTERNATE ROUTE
# =========================================================

def build_alternate_route(
    primary
):

    primary_distance = primary["distance_km"]

    alternate_distance = round(
        primary_distance * 1.08
    )

    average_speed = 42

    travel_time_min = calculate_travel_time(
        alternate_distance,
        average_speed
    )

    source = primary["source"]

    target = primary["target"]

    primary_probability = primary[
        "risk_probability"
    ]

    alternate_probability = min(
        primary_probability + 8,
        95
    )

    if alternate_probability >= 70:

        risk_level = "HIGH"

    elif alternate_probability >= 40:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"

    alternate_geometry = create_alternate_geometry(
        source,
        target
    )

    return {

        "route_type": "Alternate",

        "source": source,

        "target": target,

        "source_capital":
            primary["source_capital"],

        "target_capital":
            primary["target_capital"],

        "distance_km":
            alternate_distance,

        "average_speed_kmh":
            average_speed,

        "travel_time_min":
            travel_time_min,

        "travel_time":
            format_travel_time(
                travel_time_min
            ),

        "rainfall_risk":
            primary["rainfall_risk"],

        "slope_risk":
            primary["slope_risk"],

        "landslide_risk":
            primary["landslide_risk"],

        "risk_level":
            risk_level,

        "risk_probability":
            alternate_probability,

        "risk_reason":
            "Alternative route with comparatively "
            "higher overall environmental risk.",

        "geometry": {

            "type": "LineString",

            "coordinates":
                alternate_geometry
        }
    }


# =========================================================
# SELECT SAFEST ROUTE
# =========================================================

def select_safest_route(
    primary,
    alternate
):

    primary_probability = primary[
        "risk_probability"
    ]

    alternate_probability = alternate[
        "risk_probability"
    ]

    if primary_probability < alternate_probability:

        safest = primary
        other = alternate

    elif alternate_probability < primary_probability:

        safest = alternate
        other = primary

    else:

        primary_priority = RISK_PRIORITY.get(
            primary["risk_level"],
            99
        )

        alternate_priority = RISK_PRIORITY.get(
            alternate["risk_level"],
            99
        )

        if primary_priority < alternate_priority:

            safest = primary
            other = alternate

        elif alternate_priority < primary_priority:

            safest = alternate
            other = primary

        elif primary["distance_km"] <= alternate["distance_km"]:

            safest = primary
            other = alternate

        else:

            safest = alternate
            other = primary

    safest["decision"] = "Recommended"

    safest["recommendation"] = (
        "SAFEST ROUTE"
    )

    safest["recommendation_reason"] = (
        "Recommended based on the lower "
        "overall risk probability and "
        "available environmental risk factors."
    )

    other["decision"] = "Alternative"

    other["recommendation"] = (
        "ALTERNATE ROUTE"
    )

    other["recommendation_reason"] = (
        "Alternative route with a comparatively "
        "higher overall risk."
    )

    return safest, other


# =========================================================
# SAFEST ROUTE
# =========================================================

def safest_route(
    graph,
    source,
    target
):

    if source not in graph.nodes:

        return {
            "error":
                f"Unknown source: {source}"
        }

    if target not in graph.nodes:

        return {
            "error":
                f"Unknown target: {target}"
        }

    if source == target:

        return {
            "error":
                "Source and destination cannot be the same."
        }

    primary = build_primary_route(
        graph,
        source,
        target
    )

    if "error" in primary:
        return primary

    alternate = build_alternate_route(
        primary
    )

    safest, other = select_safest_route(
        primary,
        alternate
    )

    return safest


# =========================================================
# ALTERNATE ROUTE
# =========================================================

def alternate_route(
    graph,
    source,
    target
):

    if source not in graph.nodes:

        return {
            "error":
                f"Unknown source: {source}"
        }

    if target not in graph.nodes:

        return {
            "error":
                f"Unknown target: {target}"
        }

    if source == target:

        return {
            "error":
                "Source and destination cannot be the same."
        }

    primary = build_primary_route(
        graph,
        source,
        target
    )

    if "error" in primary:
        return primary

    alternate = build_alternate_route(
        primary
    )

    safest, other = select_safest_route(
        primary,
        alternate
    )

    return other
