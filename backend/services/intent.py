
import re

def classify_intent(predicted_class_index):
    """
    Maps the model's predicted class index to a human-readable intent.
    Now 100% driven by the ML model's decision.
    """
    
    INTENT_MAP = {
        0: "Safe Navigation",
        1: "Credential Theft",      # Target: Login pages
        2: "Malware Distribution",  # Target: Drive-by downloads
        3: "Social Engineering"     # Target: Scams, Fake offers
    }
    
    return INTENT_MAP.get(predicted_class_index, "General Suspicious Activity")
