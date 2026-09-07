from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="District Risk Prediction API")

# Serve static files (CSV, HTML, etc.) from current folder
app.mount("/static", StaticFiles(directory="."), name="static")

model = joblib.load("risk_model.pkl")

label_map = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}

class RiskRequest(BaseModel):
    rainfall: float
    elevation: float
    slope: float
    landslides: int

def predict_risk(rainfall, elevation, slope, landslides):
    sample = pd.DataFrame(
        [[rainfall, elevation, slope, landslides]],
        columns=[
            "annual_rainfall_2022_mm",
            "elevation_m",
            "slope_deg",
            "historical_landslides_1998_2022_state_count"
        ]
    )
    prob = model.predict_proba(sample)[0]
    pred_num = model.predict(sample)[0]
    pred = label_map[int(pred_num)]
    return {"risk_probability": float(max(prob)), "risk_level": pred}

@app.get("/")
def home():
    # Since you are already inside member2, just point to index.html directly
    return FileResponse("index.html")

@app.post("/predict")
def get_prediction(request: RiskRequest):
    return predict_risk(request.rainfall, request.elevation, request.slope, request.landslides)
