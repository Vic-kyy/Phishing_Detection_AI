from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import urlparse

# Updated import path
from features.feature_extractor import featureExtraction
from services.predictor import predict_url
from services.explain import explain_prediction
from services.intent import classify_intent

app = FastAPI(
    title="PhishHover Backend",
    version="1.0",
    description="Pre-click phishing detection API"
)

# Enable CORS for Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# =========================
# Request & Response Models
# =========================

class URLRequest(BaseModel):
    url: str


class PredictionResponse(BaseModel):
    risk_score: float
    label: str
    intent: str
    explanations: list[str]


# =========================
# Trusted Domain Allowlist
# =========================

TRUSTED_DOMAINS = [
    "google.com",
    "youtube.com",
    "amazon.com",
    "amazon.in",
    "microsoft.com",
    "apple.com",
    "onlinesbi.sbi",
    "icicibank.com",
    "hdfcbank.com",
    "india.gov.in",
    "gov.in"
]


# =========================
# Routes
# =========================

@app.get("/")
def root():
    return {"status": "PhishHover backend is running"}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: URLRequest):
    try:
        domain = urlparse(request.url).netloc.lower()

        # ✅ Option 2: Trusted domain override
        for trusted in TRUSTED_DOMAINS:
            if trusted in domain:
                return {
                    "risk_score": 0.0,
                    "label": "legitimate",
                    "intent": "Safe Navigation",
                    "explanations": ["This is a verified trusted domain."]
                }

        # 🔍 ML-based prediction
        features = featureExtraction(request.url)
        risk, label, predicted_class_idx = predict_url(features)
        
        # 🧠 Explainability & Intent
        explanations = explain_prediction(features, risk)
        intent = classify_intent(predicted_class_idx) if label == "phishing" else "Safe Navigation"

        return {
            "risk_score": round(risk, 3),
            "label": label,
            "intent": intent,
            "explanations": explanations
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
