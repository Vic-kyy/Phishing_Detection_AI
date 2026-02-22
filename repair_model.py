
import pickle
import os
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline

# Define model path
MODEL_PATH = "backend/model/phishing_model.pkl"

def create_dummy_model():
    """
    Creates a simple compatible model for the hackathon to resolve version mismatch errors.
    This mimics the expected interface of the original model.
    """
    print("Creating a fresh, compatible model...")
    
    # Create a simple GradientBoostingClassifier (similar to what was likely used)
    # We train it on a tiny dummy dataset just so it has the right structure
    # X features structure (16 features total):
    # [IP, @, Length, Depth, Redirect, HTTPS, Tiny, Prefix, DNS, Traffic, Age, End, Iframe, Mouse, RightClick, Forward]

    X_dummy = [
        # ✅ CLASS 0: LEGITIMATE
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], # Pure safe
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], # Safe but Long & Deep
        
        # ⚠️ CLASS 1: CREDENTIAL THEFT (Login pages, IP usage, Redirects)
        [1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1], # IP + Redirect + Forwarding
        [0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], # @ + Long + Deep

        # ☣️ CLASS 2: MALWARE (Exe files, Iframes, No Right Click)
        [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0], # Iframe + MouseOver + NoRightClick
        
        # 🎣 CLASS 3: SOCIAL ENGINEERING (TinyURL, Scarcity, Typosquatting)
        [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0], # TinyURL + Prefix
    ]
    
    # Target Labels:
    # 0 = Legitimate
    # 1 = Credential Theft
    # 2 = Malware
    # 3 = Social Engineering
    y_dummy = [0, 0, 1, 1, 2, 3]

    print(f"Training multi-class model on {len(X_dummy)} samples...")
    clf = GradientBoostingClassifier(n_estimators=20, learning_rate=0.5, max_depth=2, random_state=42)
    clf.fit(X_dummy, y_dummy)

    # Save the model
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(clf, f)
    
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    # Ensure directory exists
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    create_dummy_model()
