import math
import time
import requests
import pandas as pd

INPUT_FILE = "member6_ml_ready_with_elevation.csv"
OUTPUT_FILE = "member6_ml_ready_with_slope.csv"

API_URL = "https://api.open-meteo.com/v1/elevation"

# Approximately 90-110 m around each district point.
# This matches the approximate resolution of the GLO-90 DEM.
OFFSET = 0.001

# Read dataset
df = pd.read_csv(INPUT_FILE)

print("Rows:", len(df))

if "latitude" not in df.columns or "longitude" not in df.columns:
    raise ValueError("latitude/longitude columns are missing.")

# Make sure required columns exist
if "slope_deg" not in df.columns:
    df["slope_deg"] = None

# Store slopes
slopes = []

session = requests.Session()
session.headers.update({
    "User-Agent": "Member6-Terrain-Analysis/1.0"
})


def get_elevations(points):
    """
    Request elevations for multiple coordinates.
    Returns a list of elevations in the same order as points.
    """

    latitudes = ",".join(str(p[0]) for p in points)
    longitudes = ",".join(str(p[1]) for p in points)

    params = {
        "latitude": latitudes,
        "longitude": longitudes
    }

    for attempt in range(1, 4):
        try:
            response = session.get(
                API_URL,
                params=params,
                timeout=60
            )

            response.raise_for_status()

            data = response.json()

            if "elevation" not in data:
                raise ValueError(f"Unexpected API response: {data}")

            return data["elevation"]

        except Exception as e:
            print(f"  Attempt {attempt}/3 failed: {e}")

            if attempt < 3:
                time.sleep(3)

    return None


def calculate_slope(center_lat, center_lon):
    """
    Calculate local slope in degrees using a 3x3 elevation neighborhood.

             NW   N   NE
              W   C    E
             SW   S   SE

    Slope is calculated from the north-south and east-west
    elevation gradients.
    """

    points = [
        (center_lat + OFFSET, center_lon - OFFSET),  # NW
        (center_lat + OFFSET, center_lon),           # N
        (center_lat + OFFSET, center_lon + OFFSET),  # NE
        (center_lat, center_lon - OFFSET),           # W
        (center_lat, center_lon),                    # C
        (center_lat, center_lon + OFFSET),           # E
        (center_lat - OFFSET, center_lon - OFFSET),  # SW
        (center_lat - OFFSET, center_lon),           # S
        (center_lat - OFFSET, center_lon + OFFSET),  # SE
    ]

    elevations = get_elevations(points)

    if elevations is None or len(elevations) != 9:
        return None

    try:
        nw, n, ne, w, c, e, sw, s, se = elevations

        # Check for missing values
        if any(v is None for v in elevations):
            return None

        # Approximate horizontal distance for 0.001 degree.
        # Latitude: about 111,000 m per degree.
        dy = 2 * OFFSET * 111000

        # Longitude distance depends on latitude.
        dx = (
            2
            * OFFSET
            * 111000
            * math.cos(math.radians(center_lat))
        )

        # Central-difference gradients.
        dz_dx = (e - w) / dx
        dz_dy = (n - s) / dy

        # Terrain gradient magnitude.
        gradient = math.sqrt(
            dz_dx ** 2 + dz_dy ** 2
        )

        # Convert to degrees.
        slope = math.degrees(
            math.atan(gradient)
        )

        return round(slope, 2)

    except Exception as e:
        print("  Slope calculation error:", e)
        return None


print()
print("Starting slope calculation...")
print("Using local 3x3 DEM neighborhood.")
print()

for i, row in df.iterrows():

    district = row["district_name"]
    lat = row["latitude"]
    lon = row["longitude"]

    print(
        f"{i + 1}/{len(df)} - "
        f"{district} - calculating slope..."
    )

    try:
        slope = calculate_slope(
            float(lat),
            float(lon)
        )

        slopes.append(slope)

        if slope is not None:
            print(
                f"    Slope = {slope} degrees"
            )
        else:
            print(
                "    Slope calculation failed"
            )

    except Exception as e:
        print(
            f"    ERROR: {e}"
        )
        slopes.append(None)

    # Small pause between requests
    time.sleep(0.5)


# Add results
df["slope_deg"] = slopes


# Update terrain status
def update_status(row):
    elevation_ok = pd.notna(row["elevation_m"])
    slope_ok = pd.notna(row["slope_deg"])

    if elevation_ok and slope_ok:
        return "ELEVATION_FILLED_SLOPE_FILLED"

    if elevation_ok and not slope_ok:
        return "ELEVATION_FILLED_SLOPE_FAILED"

    if not elevation_ok and slope_ok:
        return "ELEVATION_FAILED_SLOPE_FILLED"

    return "ELEVATION_FAILED_SLOPE_FAILED"


df["terrain_data_status"] = df.apply(
    update_status,
    axis=1
)


# Save
df.to_csv(
    OUTPUT_FILE,
    index=False
)


print()
print("===================================")
print("FINISHED")
print("===================================")
print("Rows:", len(df))
print(
    "Slope filled:",
    df["slope_deg"].notna().sum()
)
print(
    "Slope missing:",
    df["slope_deg"].isna().sum()
)
print()
print("Saved:", OUTPUT_FILE)
print()
print(
    df[
        [
            "district_name",
            "elevation_m",
            "slope_deg",
            "terrain_data_status"
        ]
    ].head(10).to_string(index=False)
)