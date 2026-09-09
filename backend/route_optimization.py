# =========================================================
# NER SMARTROUTE - ROUTE OPTIMIZATION
# =========================================================

import math
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import networkx as nx
from scipy.spatial import cKDTree

from weather_service import get_current_weather, get_location_name


LOGGER = logging.getLogger(__name__)


# =========================================================
# LOAD DATASETS
# =========================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent
GIS_DATA_DIR = PROJECT_ROOT / "Member-4-GIS and Routing"


try:
    rainfall_slope_df = pd.read_csv(
        PROJECT_ROOT / "member6_ml_ready_with_slope.csv"
    )
except Exception as error:
    LOGGER.warning(
        "Could not load environmental dataset: %s",
        error
    )
    rainfall_slope_df = pd.DataFrame()


try:
    district_risk_df = pd.read_csv(
        PROJECT_ROOT / "district_risk_predictions.csv"
    )
except Exception as error:
    LOGGER.warning(
        "Could not load district risk dataset: %s",
        error
    )
    district_risk_df = pd.DataFrame()


# =========================================================
# ENVIRONMENTAL DATA
# =========================================================

ENVIRONMENTAL_COLUMNS = [
    "annual_rainfall_2022_mm",
    "slope_deg",
    "historical_landslides_1998_2022_state_count",
    "prototype_risk_score"
]


if not rainfall_slope_df.empty:

    required_columns = [
        "latitude",
        "longitude",
        *ENVIRONMENTAL_COLUMNS
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in rainfall_slope_df.columns
    ]

    if missing_columns:

        LOGGER.warning(
            "Environmental dataset missing columns: %s",
            missing_columns
        )

        environmental_data = pd.DataFrame()
        ENVIRONMENTAL_TREE = None
        ENVIRONMENTAL_VALUES = np.empty(
            (0, 4),
            dtype=float
        )

    else:

        environmental_data = rainfall_slope_df.dropna(
            subset=required_columns
        ).copy()

        environmental_coordinates = (
            environmental_data[
                ["latitude", "longitude"]
            ]
            .to_numpy(dtype=float)
        )

        ENVIRONMENTAL_VALUES = (
            environmental_data[
                ENVIRONMENTAL_COLUMNS
            ]
            .to_numpy(dtype=float)
        )

        if len(environmental_coordinates) > 0:

            ENVIRONMENTAL_TREE = cKDTree(
                environmental_coordinates
            )

        else:

            ENVIRONMENTAL_TREE = None

            ENVIRONMENTAL_VALUES = np.empty(
                (0, 4),
                dtype=float
            )

else:

    environmental_data = pd.DataFrame()

    ENVIRONMENTAL_TREE = None

    ENVIRONMENTAL_VALUES = np.empty(
        (0, 4),
        dtype=float
    )


# =========================================================
# STATE COORDINATES
# =========================================================

STATE_COORDINATES = {

    "Assam":
        (26.1445, 91.7362),

    "Arunachal Pradesh":
        (27.0844, 93.6053),

    "Manipur":
        (24.8170, 93.9368),

    "Meghalaya":
        (25.5788, 91.8933),

    "Mizoram":
        (23.7271, 92.7176),

    "Nagaland":
        (25.6751, 94.1086),

    "Sikkim":
        (27.3389, 88.6065),

    "Tripura":
        (23.8315, 91.2868),

    "West Tripura":
        (23.8315, 91.2868)
}


# =========================================================
# STATE CAPITALS
# =========================================================

STATE_CAPITALS = {

    "Assam":
        "Guwahati",

    "Arunachal Pradesh":
        "Itanagar",

    "Manipur":
        "Imphal",

    "Meghalaya":
        "Shillong",

    "Mizoram":
        "Aizawl",

    "Nagaland":
        "Kohima",

    "Sikkim":
        "Gangtok",

    "Tripura":
        "Agartala",

    "West Tripura":
        "Agartala"
}


# =========================================================
# LOCATION ALIASES
# =========================================================

LOCATION_ALIASES = {

    "guwahati":
        "Assam",

    "assam":
        "Assam",

    "itanagar":
        "Arunachal Pradesh",

    "arunachal pradesh":
        "Arunachal Pradesh",

    "arunachal":
        "Arunachal Pradesh",

    "imphal":
        "Manipur",

    "manipur":
        "Manipur",

    "shillong":
        "Meghalaya",

    "meghalaya":
        "Meghalaya",

    "aizawl":
        "Mizoram",

    "mizoram":
        "Mizoram",

    "kohima":
        "Nagaland",

    "nagaland":
        "Nagaland",

    "gangtok":
        "Sikkim",

    "sikkim":
        "Sikkim",

    "agartala":
        "Tripura",

    "tripura":
        "Tripura",

    "west tripura":
        "West Tripura"
}


# =========================================================
# NORMALIZE LOCATION
# =========================================================

def normalize_state(location):

    if location is None:
        return None

    location = str(location).strip().lower()

    return LOCATION_ALIASES.get(location)


# =========================================================
# ROAD NETWORK
# =========================================================

ROAD_NODES = pd.read_csv(
    GIS_DATA_DIR / "road_nodes-1.csv"
)


ROAD_EDGES = pd.read_csv(
    GIS_DATA_DIR / "road_edges.csv.gz"
)


# =========================================================
# NODE COORDINATES
# =========================================================

NODE_COORDINATES = {

    int(row.node_id):
        (
            float(row.longitude),
            float(row.latitude)
        )

    for row in ROAD_NODES.itertuples()
}


# =========================================================
# GRAPH
# =========================================================

G = nx.DiGraph()


for row in ROAD_EDGES.itertuples():

    G.add_edge(

        int(row.from_node),

        int(row.to_node),

        length_m=float(row.length_m),

        road_id=str(row.road_id),

        direction=getattr(
            row,
            "direction",
            None
        )
    )


# =========================================================
# RESTORE PHYSICAL JUNCTIONS
# =========================================================

node_ids = ROAD_NODES.node_id.to_numpy()

mean_latitude = ROAD_NODES.latitude.mean()


projected_coordinates = ROAD_NODES[
    ["latitude", "longitude"]
].to_numpy(
    dtype=float,
    copy=True
)


projected_coordinates[:, 1] *= math.cos(
    math.radians(mean_latitude)
)


projected_coordinates *= 111320


junction_tree = cKDTree(
    projected_coordinates
)


junction_pairs = junction_tree.query_pairs(
    50
)


for first_index, second_index in junction_pairs:

    first_node = int(
        node_ids[first_index]
    )

    second_node = int(
        node_ids[second_index]
    )


    # Add only if the directed edge does not
    # already exist with useful road information.

    if not G.has_edge(
        first_node,
        second_node
    ):

        G.add_edge(

            first_node,

            second_node,

            length_m=0.0,

            road_id=None,

            direction="junction"
        )


    if not G.has_edge(
        second_node,
        first_node
    ):

        G.add_edge(

            second_node,

            first_node,

            length_m=0.0,

            road_id=None,

            direction="junction"
        )


# =========================================================
# ROAD COMPONENTS
# =========================================================

ROAD_COMPONENTS = list(
    nx.weakly_connected_components(G)
)


ROAD_COMPONENT_BY_NODE = {

    node:
        component_number

    for component_number, component
    in enumerate(ROAD_COMPONENTS)

    for node in component
}


STATE_ENDPOINT_CANDIDATES = {}


# =========================================================
# VEHICLE TYPES
# =========================================================

VEHICLE_TYPES = {

    "two_wheeler":
        "🏍️ Two-Wheeler",

    "four_wheeler":
        "🚗 Four-Wheeler",

    "emergency_vehicle":
        "🚑 Emergency Vehicle",

    "logistics_vehicle":
        "🚚 Logistics Vehicle"
}


DEFAULT_VEHICLE_TYPE = (
    "logistics_vehicle"
)


VEHICLE_RESTRICTIONS_SUPPORTED = False


MAX_MEANINGFUL_ROUTES = 5


# =========================================================
# ROUTE RECOMMENDATION PARAMETERS
# =========================================================

SAFETY_IMPROVEMENT_SIGNIFICANT = 5.0

DISTANCE_ADVANTAGE_MEANINGFUL = 10.0

DISTANCE_PREMIUM_REASONABLE = 35.0


# =========================================================
# WEATHER PARAMETERS
# =========================================================

WEATHER_SAMPLE_COUNT = 5

WEATHER_MAX_RISK = 100.0


# =========================================================
# PERFORMANCE PARAMETERS
# =========================================================

CANDIDATE_MULTIPLIER = 20

DUPLICATE_OVERLAP_THRESHOLD = 0.80


# =========================================================
# ENVIRONMENT CACHE
# =========================================================

ENVIRONMENT_NODE_CACHE = {}


# =========================================================
# WEATHER CACHE
# =========================================================

WEATHER_CACHE = {}


# =========================================================
# STATE ENDPOINT CANDIDATES
# =========================================================

def _state_endpoint_candidates(state):

    if state not in STATE_COORDINATES:

        return []


    if state not in STATE_ENDPOINT_CANDIDATES:

        latitude, longitude = STATE_COORDINATES[
            state
        ]

        latitude_difference = (
            ROAD_NODES.latitude
            - latitude
        )

        longitude_difference = (
            ROAD_NODES.longitude
            - longitude
        )

        squared_distance = (
            latitude_difference ** 2
            +
            longitude_difference ** 2
        )

        nearest_indices = (
            squared_distance
            .nsmallest(3000)
            .index
        )

        nearest_nodes = ROAD_NODES.loc[
            nearest_indices
        ]

        candidates = []

        for index, row in nearest_nodes.iterrows():

            node_id = int(
                row.node_id
            )

            if node_id not in ROAD_COMPONENT_BY_NODE:
                continue

            offset = float(
                squared_distance.loc[index]
            ) ** 0.5

            candidates.append(
                (
                    node_id,
                    offset
                )
            )

        STATE_ENDPOINT_CANDIDATES[state] = (
            candidates
        )

    return STATE_ENDPOINT_CANDIDATES[
        state
    ]


# =========================================================
# SELECT ENDPOINT PAIR
# =========================================================

def _select_endpoint_pair(
    source,
    target
):

    source_by_component = {}


    for node, offset in _state_endpoint_candidates(
        source
    ):

        component = ROAD_COMPONENT_BY_NODE.get(
            node
        )

        if component is None:
            continue

        existing = source_by_component.get(
            component
        )

        if (
            existing is None
            or
            offset < existing[1]
        ):

            source_by_component[component] = (
                node,
                offset
            )


    target_by_component = {}


    for node, offset in _state_endpoint_candidates(
        target
    ):

        component = ROAD_COMPONENT_BY_NODE.get(
            node
        )

        if component is None:
            continue

        existing = target_by_component.get(
            component
        )

        if (
            existing is None
            or
            offset < existing[1]
        ):

            target_by_component[component] = (
                node,
                offset
            )


    common_components = (
        set(source_by_component)
        &
        set(target_by_component)
    )


    if not common_components:
        return None


    component_number = min(

        common_components,

        key=lambda number: (

            source_by_component[number][1]
            +
            target_by_component[number][1]

        )
    )


    return (

        source_by_component[
            component_number
        ][0],

        target_by_component[
            component_number
        ][0]
    )


# =========================================================
# FAST ENVIRONMENT LOOKUP
# =========================================================

def _environment_for_node(node_id):

    """
    Return nearest environmental record.

    Uses a node-level cache and NumPy values
    instead of repeated pandas row access.
    """

    if ENVIRONMENTAL_TREE is None:
        return None


    node_id = int(node_id)


    cached = ENVIRONMENT_NODE_CACHE.get(
        node_id
    )


    if cached is not None:
        return cached


    coordinates = NODE_COORDINATES.get(
        node_id
    )


    if coordinates is None:
        return None


    longitude, latitude = coordinates


    _, nearest_index = ENVIRONMENTAL_TREE.query(
        [
            latitude,
            longitude
        ]
    )


    nearest_index = int(
        nearest_index
    )


    if (
        nearest_index < 0
        or
        nearest_index >= len(
            ENVIRONMENTAL_VALUES
        )
    ):
        return None


    values = ENVIRONMENTAL_VALUES[
        nearest_index
    ]


    environment = {

        column:
            float(value)

        for column, value
        in zip(
            ENVIRONMENTAL_COLUMNS,
            values
        )
    }


    ENVIRONMENT_NODE_CACHE[
        node_id
    ] = environment


    return environment


# =========================================================
# BATCH ENVIRONMENT LOOKUP
# =========================================================

def _environment_for_nodes(node_ids):

    """
    High-performance batch environmental lookup.

    All uncached nodes are queried against the KD-tree
    in one operation.
    """

    if ENVIRONMENTAL_TREE is None:
        return {}


    unique_nodes = list(
        dict.fromkeys(
            int(node)
            for node in node_ids
        )
    )


    result = {}

    uncached_nodes = []


    for node_id in unique_nodes:

        cached = ENVIRONMENT_NODE_CACHE.get(
            node_id
        )

        if cached is not None:

            result[node_id] = cached

        elif node_id in NODE_COORDINATES:

            uncached_nodes.append(
                node_id
            )


    if not uncached_nodes:
        return result


    query_coordinates = np.asarray(

        [

            [
                NODE_COORDINATES[node_id][1],
                NODE_COORDINATES[node_id][0]
            ]

            for node_id in uncached_nodes

        ],

        dtype=float
    )


    _, nearest_indices = (
        ENVIRONMENTAL_TREE.query(
            query_coordinates
        )
    )


    nearest_indices = np.asarray(
        nearest_indices,
        dtype=int
    )


    selected_values = (
        ENVIRONMENTAL_VALUES[
            nearest_indices
        ]
    )


    for index, node_id in enumerate(
        uncached_nodes
    ):

        values = selected_values[
            index
        ]


        environment = {

            column:
                float(value)

            for column, value
            in zip(
                ENVIRONMENTAL_COLUMNS,
                values
            )
        }


        ENVIRONMENT_NODE_CACHE[
            node_id
        ] = environment


        result[node_id] = environment


    return result


# =========================================================
# RISK BAND
# =========================================================

def _risk_band(
    value,
    values
):

    if (
        values is None
        or
        len(values) == 0
        or
        value is None
    ):

        return "Medium"


    low_threshold = values.quantile(
        0.33
    )


    high_threshold = values.quantile(
        0.66
    )


    if value >= high_threshold:
        return "High"


    if value >= low_threshold:
        return "Medium"


    return "Low"


# =========================================================
# CALCULATE GIS ROUTE ENVIRONMENT
# =========================================================

def _calculate_route_environment(
    graph,
    path
):

    """
    Calculate length-weighted environmental risk
    for the actual GIS route.
    """

    if ENVIRONMENTAL_TREE is None:
        return None


    if not path or len(path) < 2:
        return None


    positive_edge_pairs = []

    route_nodes = []


    for first_node, second_node in zip(
        path,
        path[1:]
    ):

        try:

            edge = graph[
                first_node
            ][
                second_node
            ]

        except KeyError:

            continue


        length_m = float(
            edge.get(
                "length_m",
                0.0
            )
        )


        if length_m <= 0:
            continue


        positive_edge_pairs.append(

            (
                first_node,
                second_node,
                length_m
            )

        )


        route_nodes.append(
            first_node
        )

        route_nodes.append(
            second_node
        )


    if not positive_edge_pairs:
        return None


    environment_map = (
        _environment_for_nodes(
            route_nodes
        )
    )


    total_length = 0.0


    weighted = {

        column:
            0.0

        for column
        in ENVIRONMENTAL_COLUMNS
    }


    for (
        first_node,
        second_node,
        length_m
    ) in positive_edge_pairs:

        first_environment = (
            environment_map.get(
                int(first_node)
            )
        )


        second_environment = (
            environment_map.get(
                int(second_node)
            )
        )


        if (
            first_environment is None
            or
            second_environment is None
        ):
            continue


        total_length += length_m


        for column in ENVIRONMENTAL_COLUMNS:

            segment_value = (

                first_environment[column]
                +
                second_environment[column]

            ) / 2.0


            weighted[column] += (
                segment_value
                *
                length_m
            )


    if total_length <= 0:
        return None


    averages = {

        column:
            value / total_length

        for column, value
        in weighted.items()
    }


    rainfall_values = (
        environmental_data[
            "annual_rainfall_2022_mm"
        ]
        if (
            not environmental_data.empty
            and
            "annual_rainfall_2022_mm"
            in environmental_data.columns
        )
        else None
    )


    slope_values = (
        environmental_data[
            "slope_deg"
        ]
        if (
            not environmental_data.empty
            and
            "slope_deg"
            in environmental_data.columns
        )
        else None
    )


    landslide_values = (
        environmental_data[
            "historical_landslides_1998_2022_state_count"
        ]
        if (
            not environmental_data.empty
            and
            "historical_landslides_1998_2022_state_count"
            in environmental_data.columns
        )
        else None
    )


    rainfall_risk = _risk_band(

        averages[
            "annual_rainfall_2022_mm"
        ],

        rainfall_values
    )


    slope_risk = _risk_band(

        averages[
            "slope_deg"
        ],

        slope_values
    )


    landslide_risk = _risk_band(

        averages[
            "historical_landslides_1998_2022_state_count"
        ],

        landslide_values
    )


    risk_probability = round(

        max(

            0.0,

            min(

                100.0,

                averages[
                    "prototype_risk_score"
                ]
                *
                100.0

            )
        ),

        1
    )


    if risk_probability >= 70:

        risk_level = "HIGH"

    elif risk_probability >= 40:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"


    return {

        "rainfall_risk":
            rainfall_risk,

        "slope_risk":
            slope_risk,

        "landslide_risk":
            landslide_risk,

        "risk_probability":
            risk_probability,

        "risk_level":
            risk_level,

        "environmental_averages":
            averages
    }


# =========================================================
# LEGACY RISK DATA
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
# LEGACY ALTERNATE WAYPOINTS
# =========================================================
# Kept only for backward compatibility.
# These are NOT used to generate fake GIS routes.

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

def get_distance(
    source,
    target
):

    source = normalize_state(source) or source
    target = normalize_state(target) or target


    endpoint_pair = _select_endpoint_pair(
        source,
        target
    )


    if endpoint_pair is None:
        return None


    try:

        path = nx.shortest_path(

            G,

            endpoint_pair[0],

            endpoint_pair[1],

            weight="length_m"
        )

    except (
        nx.NetworkXNoPath,
        nx.NodeNotFound
    ):

        return None


    return (

        sum(

            float(
                G[
                    first_node
                ][
                    second_node
                ][
                    "length_m"
                ]
            )

            for first_node, second_node
            in zip(
                path,
                path[1:]
            )

        )

        / 1000.0
    )


# =========================================================
# GET LEGACY RISK
# =========================================================

def get_risk(
    source,
    target
):

    source = normalize_state(source) or source
    target = normalize_state(target) or target


    if (
        source,
        target
    ) in RISK_DATA:

        return RISK_DATA[
            (
                source,
                target
            )
        ]


    if (
        target,
        source
    ) in RISK_DATA:

        return RISK_DATA[
            (
                target,
                source
            )
        ]


    return {

        "rainfall_risk":
            "Medium",

        "slope_risk":
            "Medium",

        "landslide_risk":
            "Medium",

        "risk_level":
            "MEDIUM",

        "risk_probability":
            50
    }


# =========================================================
# TRAVEL TIME
# =========================================================

def calculate_travel_time(
    distance_km,
    average_speed_kmh=45
):

    if distance_km is None:
        return None


    if average_speed_kmh <= 0:
        return None


    return round(

        (
            distance_km
            /
            average_speed_kmh
        )
        *
        60,

        1
    )


# =========================================================
# FORMAT TRAVEL TIME
# =========================================================

def format_travel_time(
    minutes
):

    if minutes is None:
        return "N/A"


    hours = int(
        minutes // 60
    )


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

    source = normalize_state(source) or source
    target = normalize_state(target) or target


    source_lat, source_lon = (
        STATE_COORDINATES[source]
    )


    target_lat, target_lon = (
        STATE_COORDINATES[target]
    )


    return [

        [
            source_lon,
            source_lat
        ],

        [
            target_lon,
            target_lat
        ]
    ]


# =========================================================
# CREATE LEGACY ALTERNATE GEOMETRY
# =========================================================
# Kept only for compatibility.
# find_meaningful_routes() DOES NOT use this.

def create_alternate_geometry(
    source,
    target
):

    source = normalize_state(source) or source
    target = normalize_state(target) or target


    source_lat, source_lon = (
        STATE_COORDINATES[source]
    )


    target_lat, target_lon = (
        STATE_COORDINATES[target]
    )


    waypoint = ALTERNATE_WAYPOINTS.get(
        (
            source,
            target
        )
    )


    if waypoint is None:

        waypoint = ALTERNATE_WAYPOINTS.get(
            (
                target,
                source
            )
        )


    if waypoint is None:

        waypoint = [

            (
                source_lon
                +
                target_lon
            )
            /
            2
            +
            0.2,

            (
                source_lat
                +
                target_lat
            )
            /
            2
            +
            0.2
        ]


    return [

        [
            source_lon,
            source_lat
        ],

        waypoint,

        [
            target_lon,
            target_lat
        ]
    ]


# =========================================================
# CREATE RISK REASON
# =========================================================

def create_reason(
    risk
):

    reasons = []


    if risk[
        "rainfall_risk"
    ] == "High":

        reasons.append(
            "high rainfall risk"
        )

    elif risk[
        "rainfall_risk"
    ] == "Medium":

        reasons.append(
            "moderate rainfall risk"
        )


    if risk[
        "slope_risk"
    ] == "High":

        reasons.append(
            "steep terrain"
        )

    elif risk[
        "slope_risk"
    ] == "Medium":

        reasons.append(
            "moderate slope conditions"
        )


    if risk[
        "landslide_risk"
    ] == "High":

        reasons.append(
            "high landslide risk"
        )

    elif risk[
        "landslide_risk"
    ] == "Medium":

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
        +
        ", ".join(reasons)
        +
        "."
    )


# =========================================================
# LIVE WEATHER FOR ROUTE
# =========================================================

def _get_route_weather(
    graph,
    path,
    sample_count=WEATHER_SAMPLE_COUNT
):

    """
    Fetch current OpenWeather conditions from
    representative points along the actual GIS route.

    Weather requests are cached by rounded coordinates.
    """

    if not path:
        return None


    route_nodes = list(path)


    if sample_count <= 0:
        sample_count = 1


    if len(route_nodes) <= sample_count:

        sample_nodes = route_nodes

    elif sample_count == 1:

        sample_nodes = [

            route_nodes[
                len(route_nodes) // 2
            ]

        ]

    else:

        indexes = [

            round(

                i
                *
                (len(route_nodes) - 1)
                /
                (sample_count - 1)

            )

            for i in range(
                sample_count
            )
        ]


        sample_nodes = [

            route_nodes[index]

            for index in indexes
        ]


    sample_nodes = list(
        dict.fromkeys(
            sample_nodes
        )
    )


    weather_samples = []


    for node_id in sample_nodes:

        coordinates = NODE_COORDINATES.get(
            node_id
        )


        if coordinates is None:
            continue


        longitude, latitude = coordinates


        cache_key = (

            round(
                latitude,
                4
            ),

            round(
                longitude,
                4
            )

        )


        weather = WEATHER_CACHE.get(
            cache_key
        )


        if weather is None:

            try:

                weather = get_current_weather(

                    latitude,

                    longitude
                )


                if weather:

                    WEATHER_CACHE[
                        cache_key
                    ] = weather


            except Exception as error:

                LOGGER.warning(

                    "Weather API failed for node %s: %s",

                    node_id,

                    error
                )

                continue


        if weather:
            weather_sample = dict(weather)
            weather_sample["location_name"] = get_location_name(
                latitude,
                longitude
            )
            weather_samples.append(weather_sample)


    if not weather_samples:
        return None


    temperatures = [

        item["temperature_c"]

        for item in weather_samples

        if item.get(
            "temperature_c"
        ) is not None
    ]


    humidities = [

        item["humidity"]

        for item in weather_samples

        if item.get(
            "humidity"
        ) is not None
    ]


    wind_speeds = [

        item["wind_speed"]

        for item in weather_samples

        if item.get(
            "wind_speed"
        ) is not None
    ]


    rain_values = [

        item.get(
            "rain_1h",
            0
        )
        or 0

        for item in weather_samples
    ]


    return {

        "sample_count":
            len(weather_samples),

        "samples": [
            {
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "temperature_c": item.get("temperature_c"),
                "humidity": item.get("humidity"),
                "wind_speed": item.get("wind_speed"),
                "rain_1h": item.get("rain_1h", 0),
                "weather": item.get("weather"),
                "description": item.get("description"),
                "location_name": item.get("location_name")
            }
            for item in weather_samples
        ],

        "temperature_c":

            (
                round(
                    sum(temperatures)
                    /
                    len(temperatures),
                    1
                )

                if temperatures

                else None
            ),

        "humidity":

            (
                round(
                    sum(humidities)
                    /
                    len(humidities),
                    1
                )

                if humidities

                else None
            ),

        "wind_speed":

            (
                round(
                    sum(wind_speeds)
                    /
                    len(wind_speeds),
                    2
                )

                if wind_speeds

                else None
            ),

        "rain_1h":

            round(

                sum(rain_values)
                /
                len(rain_values),

                2
            ),

        "conditions": [

            item["weather"]

            for item in weather_samples

            if item.get("weather")
        ],

        "descriptions": [

            item["description"]

            for item in weather_samples

            if item.get("description")
        ]
    }


# =========================================================
# CALCULATE LIVE WEATHER RISK
# =========================================================

def _calculate_weather_risk(
    weather
):

    if not weather:

        return {

            "weather_risk_probability":
                0.0,

            "weather_risk_level":
                "UNKNOWN",

            "weather_risk_reason":
                "Live weather data was unavailable."
        }


    rain = weather.get(
        "rain_1h",
        0
    ) or 0


    humidity = weather.get(
        "humidity",
        0
    ) or 0


    wind = weather.get(
        "wind_speed",
        0
    ) or 0


    weather_condition = str(

        weather.get(
            "conditions",
            []
        )

    ).lower()


    risk = 0.0

    reasons = []


    if rain >= 10:

        risk += 60

        reasons.append(
            "heavy current rainfall"
        )

    elif rain >= 5:

        risk += 40

        reasons.append(
            "moderate-to-heavy current rainfall"
        )

    elif rain >= 2:

        risk += 25

        reasons.append(
            "moderate current rainfall"
        )

    elif rain > 0:

        risk += 10

        reasons.append(
            "current rainfall"
        )


    if wind >= 15:

        risk += 25

        reasons.append(
            "strong winds"
        )

    elif wind >= 10:

        risk += 15

        reasons.append(
            "elevated wind speed"
        )

    elif wind >= 5:

        risk += 5


    if humidity >= 90:

        risk += 10

        reasons.append(
            "very high humidity"
        )

    elif humidity >= 80:

        risk += 5


    severe_conditions = [

        "thunderstorm",

        "tornado",

        "squall"
    ]


    if any(

        condition in weather_condition

        for condition
        in severe_conditions

    ):

        risk += 20

        reasons.append(
            "severe weather condition"
        )


    risk = min(
        WEATHER_MAX_RISK,
        risk
    )


    if risk >= 70:

        risk_level = "HIGH"

    elif risk >= 40:

        risk_level = "MEDIUM"

    elif risk > 0:

        risk_level = "LOW"

    else:

        risk_level = "MINIMAL"


    if not reasons:

        reason = (

            "Current weather conditions "
            "show no significant additional "
            "weather risk."
        )

    else:

        reason = (

            "Live weather indicates "
            +
            ", ".join(reasons)
            +
            "."
        )


    return {

        "weather_risk_probability":
            round(
                risk,
                1
            ),

        "weather_risk_level":
            risk_level,

        "weather_risk_reason":
            reason
    }


# =========================================================
# CALCULATE BASIC ROUTE INFORMATION
# =========================================================

def _calculate_route_segments(
    graph,
    path
):

    """
    Lightweight route calculation.

    This function does NOT calculate environmental
    risk or weather.
    """

    if not path or len(path) < 2:
        return None


    edge_distances = []

    road_segment_ids = []

    road_segment_lengths = {}


    for source_node, target_node in zip(
        path,
        path[1:]
    ):

        try:

            edge = graph[
                source_node
            ][
                target_node
            ]

        except KeyError:

            return None


        distance_km = float(
            edge.get(
                "length_m",
                0.0
            )
        ) / 1000.0


        edge_distances.append(
            distance_km
        )


        if (

            distance_km > 0

            and

            edge.get(
                "road_id"
            ) is not None

        ):

            road_id = str(
                edge["road_id"]
            )


            road_segment_ids.append(
                road_id
            )


            road_segment_lengths[
                road_id
            ] = (

                road_segment_lengths.get(
                    road_id,
                    0.0
                )

                +
                distance_km
            )


    if not edge_distances:
        return None


    distance_km = sum(
        edge_distances
    )


    if distance_km <= 0:
        return None


    return {

        "distance_km":
            distance_km,

        "road_segment_ids":
            road_segment_ids,

        "road_segment_lengths":
            road_segment_lengths
    }


# =========================================================
# BUILD GRAPH ROUTE
# =========================================================

def build_graph_route(
    graph,
    path,
    route_number,
    route_source,
    route_target,
    vehicle_type=None
):

    """
    Build final route.

    Expensive GIS and weather operations happen
    only for accepted meaningful candidates.
    """

    if not path or len(path) < 2:
        return None


    route_segments = (
        _calculate_route_segments(
            graph,
            path
        )
    )


    if route_segments is None:
        return None


    distance_km = route_segments[
        "distance_km"
    ]


    road_segment_ids = route_segments[
        "road_segment_ids"
    ]


    road_segment_lengths = route_segments[
        "road_segment_lengths"
    ]


    # =====================================================
    # GIS ENVIRONMENTAL RISK
    # =====================================================

    route_environment = (
        _calculate_route_environment(
            graph,
            path
        )
    )


    if route_environment is None:

        LOGGER.warning(

            "Environmental risk unavailable "
            "for route %s.",

            route_number
        )

        return None


    # =====================================================
    # LIVE WEATHER
    # =====================================================

    route_weather = (
        _get_route_weather(
            graph,
            path,
            sample_count=WEATHER_SAMPLE_COUNT
        )
    )


    weather_risk = (
        _calculate_weather_risk(
            route_weather
        )
    )


    # =====================================================
    # GIS RISK
    # =====================================================

    gis_risk_probability = (
        route_environment[
            "risk_probability"
        ]
    )


    # =====================================================
    # WEATHER RISK
    # =====================================================

    weather_risk_probability = (
        weather_risk[
            "weather_risk_probability"
        ]
    )


    # =====================================================
    # FINAL RISK
    #
    # GIS = 80%
    # Weather = 20%
    # =====================================================

    risk_probability = round(

        (
            gis_risk_probability
            *
            0.80
        )

        +

        (
            weather_risk_probability
            *
            0.20
        ),

        1
    )


    risk_probability = min(

        100.0,

        max(
            0.0,
            risk_probability
        )
    )


    if risk_probability >= 70:

        risk_level = "HIGH"

    elif risk_probability >= 40:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"


    # =====================================================
    # SAFETY SCORE
    # =====================================================

    safety_score = round(

        100.0
        -
        risk_probability,

        1
    )


    # =====================================================
    # SAFETY BAND
    # =====================================================

    if safety_score >= 80:

        safety_band = "Excellent"

    elif safety_score >= 60:

        safety_band = "Good"

    elif safety_score >= 40:

        safety_band = "Moderate"

    else:

        safety_band = "High Risk"


    # =====================================================
    # TRAVEL TIME
    # =====================================================

    average_speed_kmh = 45


    travel_time_min = (
        calculate_travel_time(
            distance_km,
            average_speed_kmh
        )
    )


    # =====================================================
    # ROUTE GEOMETRY
    # =====================================================

    geometry = [

        list(
            NODE_COORDINATES[node]
        )

        for node in path

        if node in NODE_COORDINATES
    ]


    if len(geometry) < 2:

        return None


    # =====================================================
    # RISK REASON
    # =====================================================

    risk_reason = create_reason({

        "rainfall_risk":
            route_environment[
                "rainfall_risk"
            ],

        "slope_risk":
            route_environment[
                "slope_risk"
            ],

        "landslide_risk":
            route_environment[
                "landslide_risk"
            ]
    })


    if route_weather:

        risk_reason += (

            " "
            +
            weather_risk[
                "weather_risk_reason"
            ]
        )


    # =====================================================
    # VEHICLE
    # =====================================================

    route_vehicle_type = (
        vehicle_type
        if vehicle_type
        else DEFAULT_VEHICLE_TYPE
    )


    vehicle_suitability = (

        "Vehicle-specific road restrictions "
        "are applied only where supported by "
        "available road-network data. No "
        "vehicle-specific restrictions are "
        "present in the supplied GIS data."
    )


    # =====================================================
    # RETURN FINAL ROUTE
    # =====================================================

    return {

        "route_id":
            f"route-{route_number}",

        "route_number":
            route_number,

        "route_type":
            "alternative",

        "source":
            route_source,

        "target":
            route_target,

        "destination":
            route_target,

        "waypoints":
            path[1:-1],

        "road_node_path":
            path,

        "road_segment_ids":
            road_segment_ids,

        "road_segment_lengths":
            road_segment_lengths,

        "source_capital":
            STATE_CAPITALS.get(
                route_source
            ),

        "target_capital":
            STATE_CAPITALS.get(
                route_target
            ),

        "distance_km":
            distance_km,

        "average_speed_kmh":
            average_speed_kmh,

        "travel_time_min":
            travel_time_min,

        "travel_time":
            format_travel_time(
                travel_time_min
            ),

        # =================================================
        # GIS ENVIRONMENT
        # =================================================

        "rainfall_risk":
            route_environment[
                "rainfall_risk"
            ],

        "slope_risk":
            route_environment[
                "slope_risk"
            ],

        "landslide_risk":
            route_environment[
                "landslide_risk"
            ],

        # =================================================
        # FINAL RISK
        # =================================================

        "risk_level":
            risk_level,

        "risk_probability":
            risk_probability,

        "safety_score":
            safety_score,

        "safety_band":
            safety_band,

        # =================================================
        # RISK BREAKDOWN
        # =================================================

        "gis_risk_probability":
            gis_risk_probability,

        "weather_risk_probability":
            weather_risk_probability,

        "live_weather":
            route_weather,

        "weather_risk_level":
            weather_risk[
                "weather_risk_level"
            ],

        "weather_risk_reason":
            weather_risk[
                "weather_risk_reason"
            ],

        # =================================================
        # RISK METHODOLOGY
        # =================================================

        "risk_data_resolution":
            (
                "Nearest environmental record "
                "sampled per road node using "
                "batched KD-tree lookup and caching."
            ),

        "risk_methodology":
            (
                "Final route risk combines the existing "
                "length-weighted GIS environmental risk "
                "with a controlled live-weather contribution "
                "from OpenWeather samples taken along the "
                "actual GIS route. GIS risk contributes 80% "
                "and live weather contributes 20%."
            ),

        "environmental_averages":
            route_environment[
                "environmental_averages"
            ],

        # =================================================
        # RISK REASON
        # =================================================

        "risk_reason":
            risk_reason,

        # =================================================
        # VEHICLE
        # =================================================

        "vehicle_type":
            route_vehicle_type,

        "vehicle_suitability":
            vehicle_suitability,

        # =================================================
        # GEOJSON
        # =================================================

        "geojson": {

            "type":
                "LineString",

            "coordinates":
                geometry
        },

        "geometry": {

            "type":
                "LineString",

            "coordinates":
                geometry
        }
    }


# =========================================================
# ROUTE SEGMENT OVERLAP
# =========================================================

def _route_segment_overlap(
    route,
    accepted
):

    """
    Return length-weighted overlap of the shorter
    GIS road corridor.
    """

    route_lengths = route.get(
        "road_segment_lengths",
        {}
    )


    accepted_lengths = accepted.get(
        "road_segment_lengths",
        {}
    )


    if (
        not route_lengths
        or
        not accepted_lengths
    ):

        return 0.0


    shared_ids = (
        route_lengths.keys()
        &
        accepted_lengths.keys()
    )


    shared_length = sum(

        min(

            route_lengths[road_id],

            accepted_lengths[road_id]

        )

        for road_id in shared_ids
    )


    shorter_length = min(

        sum(
            route_lengths.values()
        ),

        sum(
            accepted_lengths.values()
        )
    )


    if shorter_length <= 0:
        return 0.0


    return (

        shared_length
        /
        shorter_length
    )


# =========================================================
# DUPLICATE ROUTE CHECK
# =========================================================

def _is_duplicate_route(
    route,
    accepted_routes,
    threshold=DUPLICATE_OVERLAP_THRESHOLD
):

    if not route.get(
        "road_segment_ids"
    ):

        return True, None


    for accepted in accepted_routes:

        overlap = (
            _route_segment_overlap(
                route,
                accepted
            )
        )


        if overlap >= threshold:

            return True, overlap


    return False, 0.0


# =========================================================
# SELECT RECOMMENDED ROUTE
# =========================================================

def _select_recommended_route(
    paths
):

    if not paths:

        return (
            None,
            None,
            None,
            "No routes available.",
            0.0,
            0.0
        )


    shortest_route = min(

        paths,

        key=lambda route: (

            route["distance_km"],

            route["travel_time_min"]
        )
    )


    safest_route = max(

        paths,

        key=lambda route: (

            route["safety_score"],

            -route["distance_km"]
        )
    )


    safety_difference = (

        safest_route[
            "safety_score"
        ]

        -

        shortest_route[
            "safety_score"
        ]
    )


    distance_difference_percent = (

        (

            (

                safest_route[
                    "distance_km"
                ]

                -

                shortest_route[
                    "distance_km"
                ]

            )

            /

            shortest_route[
                "distance_km"
            ]

            *

            100

        )

        if shortest_route[
            "distance_km"
        ]

        else

        0.0
    )


    shortest_score = (
        shortest_route[
            "safety_score"
        ]
    )


    # =====================================================
    # ONLY ONE ROUTE
    # =====================================================

    if len(paths) == 1:

        recommended_route = (
            shortest_route
        )


        reason = (

            "Only one meaningful GIS road route "
            "is available, so the available route "
            "is recommended."
        )


        return (

            shortest_route,

            safest_route,

            recommended_route,

            reason,

            round(
                safety_difference,
                1
            ),

            round(
                distance_difference_percent,
                1
            )
        )


    # =====================================================
    # SHORTEST IS ALSO SAFEST
    # =====================================================

    if shortest_route is safest_route:

        recommended_route = (
            shortest_route
        )


        reason = (

            "The shortest meaningful GIS route "
            "also has the highest safety score, "
            "so it is the best practical route."
        )


    # =====================================================
    # SHORTEST = EXCELLENT
    # =====================================================

    elif shortest_score >= 80:

        prefer_safest = (

            safety_difference
            >
            SAFETY_IMPROVEMENT_SIGNIFICANT

            and

            distance_difference_percent
            <=
            DISTANCE_PREMIUM_REASONABLE
        )


        recommended_route = (

            safest_route

            if prefer_safest

            else

            shortest_route
        )


        reason = (

            "The shortest route already provides "
            "Excellent safety. The safest route is "
            "recommended only when its safety improvement "
            "justifies the additional distance."

            if not prefer_safest

            else

            "The safest route provides a significant "
            "safety improvement with a reasonable "
            "additional distance over the shortest route."
        )


    # =====================================================
    # SHORTEST = GOOD
    # =====================================================

    elif shortest_score >= 60:

        prefer_safest = (

            safety_difference
            >
            SAFETY_IMPROVEMENT_SIGNIFICANT

            or

            distance_difference_percent
            <
            DISTANCE_ADVANTAGE_MEANINGFUL
        )


        recommended_route = (

            safest_route

            if prefer_safest

            else

            shortest_route
        )


        reason = (

            "The shortest route has Good safety and "
            "a meaningful distance/time advantage, "
            "so the safety gap does not justify the detour."

            if not prefer_safest

            else

            "The safest route provides enough additional "
            "safety to justify its additional distance "
            "over the shortest route."
        )


    # =====================================================
    # SHORTEST = MODERATE / HIGH RISK
    # =====================================================

    else:

        acceptable_safer_routes = [

            route

            for route in paths

            if (

                route[
                    "safety_score"
                ]
                >=
                60

                and

                route[
                    "safety_score"
                ]
                >
                shortest_score
            )
        ]


        recommended_route = max(

            acceptable_safer_routes
            or
            [safest_route],

            key=lambda route: (

                route[
                    "safety_score"
                ],

                -route[
                    "distance_km"
                ]
            )
        )


        reason = (

            "The shortest route is below Good safety, "
            "so a meaningfully safer route is recommended."

            if recommended_route is not shortest_route

            else

            "No meaningfully safer acceptable route "
            "is available; the shortest meaningful route "
            "remains the practical choice."
        )


    return (

        shortest_route,

        safest_route,

        recommended_route,

        reason,

        round(
            safety_difference,
            1
        ),

        round(
            distance_difference_percent,
            1
        )
    )


# =========================================================
# FIND MEANINGFUL GRAPH ROUTES
# =========================================================

def find_meaningful_routes(
    graph,
    source,
    target,
    max_routes=MAX_MEANINGFUL_ROUTES,
    vehicle_type=None
):

    """
    Find real GIS road routes.

    Important:
    - Candidate paths are generated first.
    - Candidates are deduplicated using road IDs.
    - Only surviving candidates are evaluated for
      environmental risk and live weather.
    - No fake alternate route is created.
    """

    # =====================================================
    # NORMALIZE
    # =====================================================

    source = normalize_state(source) or source

    target = normalize_state(target) or target


    # =====================================================
    # VALIDATION
    # =====================================================

    if source not in STATE_COORDINATES:

        return {

            "error":
                f"Unknown source: {source}"
        }


    if target not in STATE_COORDINATES:

        return {

            "error":
                f"Unknown target: {target}"
        }


    if source == target:

        return {

            "error":
                "Source and destination cannot be the same."
        }


    try:

        route_limit = max(

            1,

            min(

                int(max_routes),

                MAX_MEANINGFUL_ROUTES

            )
        )

    except (
        TypeError,
        ValueError
    ):

        route_limit = MAX_MEANINGFUL_ROUTES


    # =====================================================
    # ENDPOINTS
    # =====================================================

    endpoint_pair = _select_endpoint_pair(
        source,
        target
    )


    if endpoint_pair is None:

        return {

            "error": (

                "No connected road-network route is "
                f"available between {source} and {target} "
                "in the supplied GIS data."
            )
        }


    source_node, target_node = (
        endpoint_pair
    )


    LOGGER.info(

        "Routing %s -> %s using GIS nodes %s -> %s",

        source,

        target,

        source_node,

        target_node
    )


    # =====================================================
    # SEARCH GRAPH
    # =====================================================

    candidate_graph = graph.copy()


    for (
        first_node,
        second_node,
        edge
    ) in candidate_graph.edges(
        data=True
    ):

        edge[
            "search_weight"
        ] = float(
            edge.get(
                "length_m",
                0.0
            )
        )


    # =====================================================
    # CANDIDATE BUDGET
    # =====================================================

    candidate_budget = max(

        20,

        route_limit
        *
        CANDIDATE_MULTIPLIER
    )


    candidate_budget = min(
        candidate_budget,
        100
    )


    # =====================================================
    # CANDIDATE PATH GENERATION
    # =====================================================

    candidate_routes = []


    for candidate_number in range(
        candidate_budget
    ):

        try:

            path = nx.shortest_path(

                candidate_graph,

                source_node,

                target_node,

                weight="search_weight"
            )

        except (
            nx.NetworkXNoPath,
            nx.NodeNotFound
        ):

            break


        # -------------------------------------------------
        # Every candidate gets its COMPLETE path.
        # -------------------------------------------------

        route_segments = (
            _calculate_route_segments(
                candidate_graph,
                path
            )
        )


        if route_segments is None:

            break


        candidate = {

            "path":
                list(path),

            "distance_km":
                float(
                    route_segments[
                        "distance_km"
                    ]
                ),

            "road_segment_ids":
                list(
                    route_segments[
                        "road_segment_ids"
                    ]
                ),

            "road_segment_lengths":
                dict(
                    route_segments[
                        "road_segment_lengths"
                    ]
                )
        }


        # -------------------------------------------------
        # CRITICAL FIX:
        #
        # Store the COMPLETE candidate.
        # The "path" is preserved.
        # -------------------------------------------------

        candidate_routes.append(
            candidate
        )


        # -------------------------------------------------
        # Penalize used positive-length edges.
        #
        # This encourages subsequent searches to
        # explore different physical corridors.
        # -------------------------------------------------

        positive_edges = []


        for first_node, second_node in zip(
            path,
            path[1:]
        ):

            try:

                edge = candidate_graph[
                    first_node
                ][
                    second_node
                ]

            except KeyError:

                continue


            length_m = float(
                edge.get(
                    "length_m",
                    0.0
                )
            )


            if length_m > 0:

                positive_edges.append(

                    (
                        first_node,
                        second_node
                    )
                )


        if not positive_edges:
            break


        for first_node, second_node in positive_edges:

            edge = candidate_graph[
                first_node
            ][
                second_node
            ]


            current_weight = float(
                edge.get(
                    "search_weight",
                    edge.get(
                        "length_m",
                        0.0
                    )
                )
            )


            edge[
                "search_weight"
            ] = (

                current_weight
                *
                1.35
            )


    LOGGER.info(

        "Generated %s lightweight candidate routes.",

        len(candidate_routes)
    )


    # =====================================================
    # SORT CANDIDATES BY DISTANCE
    # =====================================================

    candidate_routes.sort(

        key=lambda candidate: (

            candidate[
                "distance_km"
            ]
        )
    )


    # =====================================================
    # REMOVE DUPLICATE CORRIDORS
    # =====================================================

    accepted_candidates = []

    removed_duplicates = 0


    for candidate in candidate_routes:

        duplicate = False


        for accepted in accepted_candidates:

            overlap = (
                _route_segment_overlap(

                    candidate,

                    accepted
                )
            )


            if overlap >= DUPLICATE_OVERLAP_THRESHOLD:

                duplicate = True

                removed_duplicates += 1

                LOGGER.info(

                    "Discarding duplicate corridor: "
                    "distance=%.3f km "
                    "overlap=%.3f",

                    candidate[
                        "distance_km"
                    ],

                    overlap
                )

                break


        if duplicate:
            continue


        # -------------------------------------------------
        # CRITICAL:
        #
        # Preserve the COMPLETE candidate INCLUDING PATH.
        # -------------------------------------------------

        accepted_candidates.append({

            "path":
                list(
                    candidate[
                        "path"
                    ]
                ),

            "distance_km":
                candidate[
                    "distance_km"
                ],

            "road_segment_ids":
                list(
                    candidate[
                        "road_segment_ids"
                    ]
                ),

            "road_segment_lengths":
                dict(
                    candidate[
                        "road_segment_lengths"
                    ]
                )
        })


        if len(
            accepted_candidates
        ) >= route_limit:

            break


    LOGGER.info(

        "Accepted %s distinct GIS corridors; "
        "removed %s duplicate corridors.",

        len(accepted_candidates),

        removed_duplicates
    )


    # =====================================================
    # BUILD FINAL ROUTES
    # =====================================================

    paths = []


    for route_number, candidate in enumerate(
        accepted_candidates,
        start=1
    ):

        # -------------------------------------------------
        # Defensive path retrieval.
        # -------------------------------------------------

        candidate_path = candidate.get(
            "path"
        )


        if (
            not candidate_path
            or
            len(candidate_path) < 2
        ):

            LOGGER.warning(

                "Skipping invalid GIS candidate "
                "without a usable path."
            )

            continue


        route = build_graph_route(

            graph,

            candidate_path,

            route_number,

            source,

            target,

            vehicle_type=vehicle_type
        )


        if route is not None:

            paths.append(
                route
            )


    # =====================================================
    # IF NO FINAL ROUTES COULD BE BUILT
    # =====================================================

    if not paths:

        return []


    # =====================================================
    # SORT BY SAFETY
    # =====================================================

    paths.sort(

        key=lambda route: (

            -route[
                "safety_score"
            ],

            route[
                "distance_km"
            ]
        )
    )


    # =====================================================
    # RENUMBER ROUTES
    # =====================================================

    for route_number, route in enumerate(
        paths,
        start=1
    ):

        route[
            "route_number"
        ] = route_number


        route[
            "route_id"
        ] = (
            f"route-{route_number}"
        )


    # =====================================================
    # SINGLE ROUTE NOTICE
    # =====================================================

    if len(paths) == 1:

        paths[0][
            "route_count"
        ] = 1


        paths[0][
            "single_route_notice"
        ] = (

            "Only one meaningful road route is available. "
            "NER SmartRoute is showing the available route "
            "instead of inventing alternatives."
        )


    else:

        for route in paths:

            route[
                "route_count"
            ] = len(paths)

            route[
                "single_route_notice"
            ] = None


    # =====================================================
    # ROUTE DECISION
    # =====================================================

    (

        shortest_route,

        safest_route,

        recommended_route,

        recommendation_reason,

        safety_difference,

        distance_difference_percent

    ) = _select_recommended_route(
        paths
    )


    # =====================================================
    # ASSIGN LABELS
    # =====================================================

    for route in paths:

        route[
            "is_shortest"
        ] = (
            route is shortest_route
        )


        route[
            "is_safest"
        ] = (
            route is safest_route
        )


        route[
            "is_recommended"
        ] = (
            route is recommended_route
        )


        route[
            "labels"
        ] = []


        if route is recommended_route:

            route[
                "labels"
            ].append(
                "RECOMMENDED"
            )


        if route is safest_route:

            route[
                "labels"
            ].append(
                "SAFEST"
            )


        if route is shortest_route:

            route[
                "labels"
            ].append(
                "SHORTEST"
            )


        route[
            "route_type"
        ] = (

            "recommended"

            if route is recommended_route

            else

            "alternative"
        )


        route[
            "decision"
        ] = (

            "Recommended"

            if route is recommended_route

            else

            "Alternative"
        )


        route[
            "recommendation"
        ] = (

            "RECOMMENDED"

            if route is recommended_route

            else

            "MEANINGFUL ROUTE"
        )


        route[
            "recommendation_reason"
        ] = (
            recommendation_reason
        )


        route[
            "safety_difference_from_shortest"
        ] = (
            safety_difference
        )


        route[
            "distance_difference_from_shortest_percent"
        ] = (
            distance_difference_percent
        )


    LOGGER.info(

        "Route decision: "
        "shortest=%.3f km "
        "safest=%.3f km "
        "recommended=%.3f km "
        "safety_difference=%.1f "
        "distance_difference_percent=%.1f",

        shortest_route[
            "distance_km"
        ],

        safest_route[
            "distance_km"
        ],

        recommended_route[
            "distance_km"
        ],

        safety_difference,

        distance_difference_percent
    )


    # =====================================================
    # RETURN ALL MEANINGFUL GIS ROUTES
    # =====================================================

    return paths


# =========================================================
# SAFEST ROUTE
# =========================================================

def safest_route(
    graph,
    source,
    target
):

    routes = find_meaningful_routes(

        graph,

        source,

        target
    )


    if (

        isinstance(
            routes,
            list
        )

        and

        routes
    ):

        return max(

            routes,

            key=lambda route: (

                route[
                    "safety_score"
                ],

                -route[
                    "distance_km"
                ]
            )
        )


    return routes