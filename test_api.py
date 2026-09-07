# =========================================================
# NER SMARTROUTE - ROUTE OPTIMIZATION TEST
# =========================================================

from route_optimization import (
    G,
    normalize_state,
    safest_route,
    alternate_route
)


# =========================================================
# TEST ROUTES
# =========================================================

TEST_ROUTES = [
    ("Assam", "Tripura"),
    ("Manipur", "Mizoram"),
    ("Arunachal Pradesh", "Meghalaya"),
    ("Sikkim", "Nagaland"),
    ("Assam", "West Tripura"),
    ("Meghalaya", "Assam"),
    ("Nagaland", "Manipur"),
    ("Mizoram", "Tripura"),
    ("Sikkim", "Assam"),
    ("Arunachal Pradesh", "Nagaland")
]


# =========================================================
# TEST LOCATION NORMALIZATION
# =========================================================

def test_normalization():

    print("\n" + "=" * 60)
    print("TESTING LOCATION NORMALIZATION")
    print("=" * 60)

    tests = {
        "Assam": "Assam",
        "Guwahati": "Assam",
        "Tripura": "Tripura",
        "Agartala": "Tripura",
        "Imphal": "Manipur",
        "Shillong": "Meghalaya",
        "Aizawl": "Mizoram",
        "Kohima": "Nagaland",
        "Gangtok": "Sikkim",
        "Itanagar": "Arunachal Pradesh"
    }

    for input_location, expected in tests.items():

        result = normalize_state(input_location)

        assert result == expected, (
            f"Normalization failed: "
            f"{input_location} → {result}, "
            f"expected {expected}"
        )

        print(
            f"✅ {input_location} → {result}"
        )

    print("\n✅ Location normalization passed")


# =========================================================
# TEST SINGLE ROUTE
# =========================================================

def test_route(source, target):

    print("\n" + "-" * 60)
    print(f"TESTING: {source} → {target}")
    print("-" * 60)

    # -----------------------------------------------------
    # NORMALIZE
    # -----------------------------------------------------

    normalized_source = normalize_state(source)
    normalized_target = normalize_state(target)

    assert normalized_source is not None
    assert normalized_target is not None

    # -----------------------------------------------------
    # SAFEST ROUTE
    # -----------------------------------------------------

    recommended = safest_route(
        G,
        normalized_source,
        normalized_target
    )

    assert recommended is not None
    assert "error" not in recommended

    # -----------------------------------------------------
    # ALTERNATE ROUTE
    # -----------------------------------------------------

    alternate = alternate_route(
        G,
        normalized_source,
        normalized_target
    )

    assert alternate is not None
    assert "error" not in alternate

    # -----------------------------------------------------
    # REQUIRED FIELDS
    # -----------------------------------------------------

    required_fields = [

        "route_type",
        "source",
        "target",
        "source_capital",
        "target_capital",
        "distance_km",
        "average_speed_kmh",
        "travel_time_min",
        "travel_time",
        "rainfall_risk",
        "slope_risk",
        "landslide_risk",
        "risk_level",
        "risk_probability",
        "risk_reason",
        "geometry",
        "decision",
        "recommendation",
        "recommendation_reason"
    ]

    for field in required_fields:

        assert field in recommended, (
            f"Recommended route missing field: {field}"
        )

        assert field in alternate, (
            f"Alternate route missing field: {field}"
        )

    # -----------------------------------------------------
    # CHECK DISTANCE
    # -----------------------------------------------------

    assert recommended["distance_km"] > 0
    assert alternate["distance_km"] > 0

    assert (
        recommended["distance_km"]
        !=
        alternate["distance_km"]
    )

    # -----------------------------------------------------
    # CHECK TRAVEL TIME
    # -----------------------------------------------------

    assert recommended["travel_time_min"] > 0
    assert alternate["travel_time_min"] > 0

    assert (
        recommended["travel_time"]
        !=
        alternate["travel_time"]
    )

    # -----------------------------------------------------
    # CHECK RISK PROBABILITY
    # -----------------------------------------------------

    assert 0 <= recommended["risk_probability"] <= 100
    assert 0 <= alternate["risk_probability"] <= 100

    # -----------------------------------------------------
    # CHECK RISK LEVEL
    # -----------------------------------------------------

    valid_risk_levels = [
        "LOW",
        "MEDIUM",
        "HIGH"
    ]

    assert recommended["risk_level"] in valid_risk_levels
    assert alternate["risk_level"] in valid_risk_levels

    # -----------------------------------------------------
    # CHECK GEOMETRY
    # -----------------------------------------------------

    assert recommended["geometry"]["type"] == "LineString"
    assert alternate["geometry"]["type"] == "LineString"

    recommended_coordinates = (
        recommended["geometry"]["coordinates"]
    )

    alternate_coordinates = (
        alternate["geometry"]["coordinates"]
    )

    assert len(recommended_coordinates) >= 2
    assert len(alternate_coordinates) >= 2

    # The two routes must not have identical geometry
    assert (
        recommended_coordinates
        !=
        alternate_coordinates
    ), "Primary and alternate geometry are identical"

    # -----------------------------------------------------
    # CHECK DECISION
    # -----------------------------------------------------

    assert recommended["decision"] == "Recommended"
    assert alternate["decision"] == "Alternative"

    # -----------------------------------------------------
    # CHECK RECOMMENDATION
    # -----------------------------------------------------

    assert (
        recommended["recommendation"]
        == "SAFEST ROUTE"
    )

    assert (
        alternate["recommendation"]
        == "ALTERNATE ROUTE"
    )

    # -----------------------------------------------------
    # CHECK SAFEST ROUTE
    # -----------------------------------------------------

    assert (
        recommended["risk_probability"]
        <=
        alternate["risk_probability"]
    ), (
        "Recommended route does not have "
        "lower/equal risk probability"
    )

    # -----------------------------------------------------
    # PRINT RESULTS
    # -----------------------------------------------------

    print("\nRecommended Route")
    print(
        "  Distance:",
        recommended["distance_km"],
        "km"
    )

    print(
        "  Travel Time:",
        recommended["travel_time"]
    )

    print(
        "  Risk Level:",
        recommended["risk_level"]
    )

    print(
        "  Risk Probability:",
        recommended["risk_probability"],
        "%"
    )

    print(
        "  Rainfall:",
        recommended["rainfall_risk"]
    )

    print(
        "  Slope:",
        recommended["slope_risk"]
    )

    print(
        "  Landslide:",
        recommended["landslide_risk"]
    )

    print("\nAlternate Route")

    print(
        "  Distance:",
        alternate["distance_km"],
        "km"
    )

    print(
        "  Travel Time:",
        alternate["travel_time"]
    )

    print(
        "  Risk Level:",
        alternate["risk_level"]
    )

    print(
        "  Risk Probability:",
        alternate["risk_probability"],
        "%"
    )

    print(
        "  Rainfall:",
        alternate["rainfall_risk"]
    )

    print(
        "  Slope:",
        alternate["slope_risk"]
    )

    print(
        "  Landslide:",
        alternate["landslide_risk"]
    )

    print("\nRecommended Geometry:")
    print(recommended_coordinates)

    print("\nAlternate Geometry:")
    print(alternate_coordinates)

    print(
        f"\n✅ {source} → {target} TEST PASSED"
    )


# =========================================================
# TEST INVALID LOCATION
# =========================================================

def test_invalid_location():

    print("\n" + "=" * 60)
    print("TESTING INVALID LOCATION")
    print("=" * 60)

    result = normalize_state("Delhi")

    assert result is None

    print("✅ Invalid location handled correctly")


# =========================================================
# TEST SAME SOURCE AND DESTINATION
# =========================================================

def test_same_location():

    print("\n" + "=" * 60)
    print("TESTING SAME SOURCE AND DESTINATION")
    print("=" * 60)

    source = normalize_state("Assam")
    target = normalize_state("Assam")

    assert source == target

    result = safest_route(
        G,
        source,
        target
    )

    assert result is not None
    assert "error" in result

    print("✅ Same source/destination handled correctly")


# =========================================================
# MAIN TEST RUNNER
# =========================================================

if __name__ == "__main__":

    print("\n")
    print("=" * 60)
    print("       NER SMARTROUTE ROUTE TEST")
    print("=" * 60)

    try:

        # Test location normalization
        test_normalization()

        # Test all 10 planned routes
        for source, target in TEST_ROUTES:

            test_route(
                source,
                target
            )

        # Test invalid location
        test_invalid_location()

        # Test same location
        test_same_location()

        # -------------------------------------------------
        # FINAL SUCCESS
        # -------------------------------------------------

        print("\n")
        print("=" * 60)
        print("🎉 ALL 10 ROUTE TESTS PASSED!")
        print("🎉 ALL ADDITIONAL TESTS PASSED!")
        print("=" * 60)

    except AssertionError as error:

        print("\n")
        print("=" * 60)
        print("❌ TEST FAILED")
        print("=" * 60)

        print("Reason:")
        print(error)

    except Exception as error:

        print("\n")
        print("=" * 60)
        print("❌ UNEXPECTED ERROR")
        print("=" * 60)

        print("Error:")
        print(error)