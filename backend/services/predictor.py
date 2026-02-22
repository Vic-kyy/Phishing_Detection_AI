import pickle
import os

# =========================
# Load Trained XGBoost Model
# =========================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "model",
    "phishing_model.pkl"
)

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)


# =========================
# Prediction Logic (Binary)
# =========================

def predict_url(features):
    """
    Input  : list of extracted URL features
    Output : (risk_score, label)

    label:
      - 'phishing'
      - 'legitimate'
    """

    # Probability breakdown
    # Classes: [0: Legit, 1: CredTheft, 2: Malware, 3: SocialEng]
    probs = model.predict_proba([features])[0]
    
    # Risk Score = Probability of NOT being class 0 (Legitimate)
    # i.e., Sum of probs of all malicious classes
    risk_score = 1.0 - probs[0]
    
    # Get the specific predicted class index (0, 1, 2, or 3)
    predicted_class = int(model.predict([features])[0])
    
    # Binary label for simple display
    label = "phishing" if predicted_class > 0 else "legitimate"

    return float(risk_score), label, predicted_class
