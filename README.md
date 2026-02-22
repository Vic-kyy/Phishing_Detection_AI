# PhishHover — Predict Before You Click

PhishHover is a real-time phishing prevention system that protects users **before** they interact with malicious links. Unlike traditional solutions that detect threats after a user clicks a link, PhishHover analyzes URLs instantly during hover events using machine learning models.

The system integrates a browser extension with an AI backend to provide:
*   Real-time phishing detection
*   Explainable AI-based reasoning
*   Intent classification of attacks
*   Risk visualization

This approach transforms phishing defense from reactive detection into proactive prevention.

---

## 🧠 Architecture Overview

**System Flow:**
1.  **User Hover** over a link.
2.  **Chrome Extension** captures the URL and sends it to the backend.
3.  **Backend API** (FastAPI) receives the request.
4.  **Feature Extraction** analyzes URL properties (length, IP usage, domains, etc.).
5.  **ML Prediction** runs the XGBoost model to calculate risk.
6.  **Explainable AI** generates human-readable reasons for the risk.
7.  **Risk Response** is sent back to the browser.
8.  **Tooltip** displays the risk score and explanation to the user.

---

## 📁 Project Structure

```
Phishing/
│
├── backend/                  # Core AI Engine
│   ├── app.py                # Main FastAPI Server
│   ├── features/
│   │   └── feature_extractor.py # URL Feature Extraction Logic
│   ├── model/
│   │   └── phishing_model.pkl   # Trained XGBoost Model
│   ├── services/
│   │   ├── predictor.py      # Inference Logic
│   │   ├── explain.py        # Explainable AI Logic
│   │   └── intent.py         # Attack Intent Classification
│   └── requirements.txt      # Python Dependencies
│
├── extension/                # Browser Frontend
│   ├── manifest.json         # Chrome Extension Configuration
│   ├── content.js            # Main Logic (Hover detection, API calls)
│   ├── panel.html            # Extension Popup
│   └── styles.css            # Tooltip Styling
│
└── demo/                     # Demonstration
    └── demo.html             # Safe environment to test links
```

---

## 🚀 Setup & Run

### 1. Backend Setup
Navigate to the backend folder and install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

Run the API server:
```bash
uvicorn app:app --reload
```
The server will start at `http://127.0.0.1:8000`.

### 2. Extension Setup
1.  Open Chrome and go to `chrome://extensions`.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `extension` folder from this project.

### 3. Usage
1.  Open `demo/demo.html` in your browser.
2.  Hover over the links to see PhishHover in action!
