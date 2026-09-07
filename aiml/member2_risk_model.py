import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

# Step 1: Load dataset
df = pd.read_csv("member6_ml_ready_with_slope.csv")

print("First 5 rows of dataset:")
print(df.head())

print("\nColumns in dataset:")
print(df.columns)

# Step 2: Preprocess and Train Model
encoder = LabelEncoder()
df["risk_label"] = encoder.fit_transform(df["prototype_risk_level"])

# Select features and target
X = df[["annual_rainfall_2022_mm", "elevation_m", "slope_deg",
        "historical_landslides_1998_2022_state_count"]]
y = df["risk_label"]

# Split into train/test sets
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train RandomForest model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate accuracy
print("Model Accuracy:", model.score(X_test, y_test))

# Save trained model for backend
joblib.dump(model, "risk_model.pkl")
print("Model saved as risk_model.pkl")

# Step 3: Prediction function (updated to avoid warnings)
def predict_risk(rainfall, elevation, slope, landslides):
    sample = pd.DataFrame([[rainfall, elevation, slope, landslides]],
                          columns=["annual_rainfall_2022_mm", "elevation_m", "slope_deg",
                                   "historical_landslides_1998_2022_state_count"])
    prob = model.predict_proba(sample)[0]
    pred = encoder.inverse_transform(model.predict(sample))[0]
    return {"risk_probability": float(max(prob)), "risk_level": pred}

# Example test with Dibrugarh values
print(predict_risk(2375.7, 107, 1.94, 2569))

# Step 4: Export predictions for all districts
predictions = []
for _, row in df.iterrows():
    result = predict_risk(row["annual_rainfall_2022_mm"],
                          row["elevation_m"],
                          row["slope_deg"],
                          row["historical_landslides_1998_2022_state_count"])
    predictions.append({
        "district_name": row["district_name"],
        "state_name": row["state_name"],
        "risk_probability": result["risk_probability"],
        "risk_level": result["risk_level"]
    })

# Save predictions to CSV
pred_df = pd.DataFrame(predictions)
pred_df.to_csv("district_risk_predictions.csv", index=False)
print("Predictions saved to district_risk_predictions.csv")
