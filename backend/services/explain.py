
import os
import pickle
import numpy as np

# Load model once
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model", "phishing_model.pkl")
_model = None

def get_model():
    global _model
    if _model is None:
        try:
            with open(MODEL_PATH, "rb") as f:
                _model = pickle.load(f)
        except Exception as e:
            print(f"Error loading model for explanation: {e}")
            return None
    return _model

FEATURE_NAMES = [
    "IP Address Check",
    "@ Symbol Check",
    "URL Length",
    "URL Depth",
    "Redirection (//)",
    "HTTP in Domain",
    "Shortening Service",
    "Prefix/Suffix (-)",
    "DNS Record",
    "Web Traffic",
    "Domain Age",
    "Domain End",
    "IFrame Redirection",
    "Status Bar Customization",
    "Right Click Disabled",
    "Website Forwarding"
]

EXPLANATION_MAP = {
    0: "URL contains an IP address (often used to evade domain blocklists).",
    1: "URL obfuscates destination using the '@' symbol.",
    2: "URL is excessively long, attempting to hide the true domain.",
    3: "URL structure is abnormally deep.",
    4: "URL redirects using '//' in an unusual position.",
    5: "Domain pretends to be 'https' within the name itself.",
    6: "Uses a URL shortening service to hide the destination.",
    7: "Domain uses a dash '-' (typosquatting technique).",
    8: "Domain has missing or suspicious DNS records.",
    9: "Website has suspiciously low traffic volume.",
    10: "Domain is very new (recently registered).",
    11: "Domain is expiring soon.",
    12: "Page uses hidden iframes.",
    13: "Page alters status bar behavior.",
    14: "Right-click context menu is disabled.",
    15: "Site has excessive forwarding/redirects."
}

def explain_prediction(features, risk_score):
    """
    Generates explanations using the Model's feature importance.
    """
    if risk_score < 0.5:
        return ["Model confidence indicates this URL is likely safe."]

    model = get_model()
    explanations = []

    # If model is loaded and has feature_importances, use them
    if model and hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        
        # Calculate contribution: Feature Value (0 or 1) * Importance
        # We only care about features that are present (value = 1) or relevant
        # For simplicity in this binary vector, we look at present features (1) that have high weight
        
        contributions = []
        for i, val in enumerate(features):
            if val == 1: # Feature is present/suspicious
                score = importances[i]
                contributions.append((score, i))
        
        # Sort by importance (highest first)
        contributions.sort(key=lambda x: x[0], reverse=True)
        
        # Take top 3 reasons
        for score, idx in contributions[:3]:
            if idx in EXPLANATION_MAP:
                explanations.append(f"{EXPLANATION_MAP[idx]} (Impact: {score:.2f})")
    
    # Fallback if no model explanation or empty (shouldn't happen with proper model)
    if not explanations:
        # Fallback to simple presence check
        for i, val in enumerate(features):
            if val == 1 and i in EXPLANATION_MAP:
                explanations.append(EXPLANATION_MAP[i])

    return explanations[:3] # Return top 3 meaningful reasons

