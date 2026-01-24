import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from twilio.twiml.messaging_response import MessagingResponse
from google import genai
import requests
from requests.auth import HTTPBasicAuth

TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") 




app = Flask(__name__)
CORS(app)

# Configuration
# The API key should be provided via environment variable


if not GEMINI_API_KEY:
    print("WARNING: API_KEY environment variable not set.")

client = genai.Client(api_key=GEMINI_API_KEY)

# In-memory storage
item_registry = [
    {
        "id": "init-1",
        "type": "LOST",
        "title": "Sample: Blue Wallet",
        "description": "Initial system check item.",
        "category": "Wallets",
        "location": {"lat": 40.7128, "lng": -74.006, "address": "Central Station"},
        "date": "2024-05-15T12:00:00Z",
        "source": "SMS",
        "contactInfo": "System"
    }
]

import re

def extract_item_with_gemini(text: str):
    """
    Uses Gemini (google-genai SDK) to turn a raw SMS into a structured JSON item.
    """
    prompt = f"""
You are a lost and found assistant. Analyze the following SMS and extract item details.

SMS text: "{text}"

Return ONLY a JSON object with these keys:
- type: "LOST" or "FOUND"
- title: Short descriptive name (3-5 words)
- description: Full details extracted from text
- category: One word category (e.g. Electronics, Pets, Wallet, Keys, Clothing)
- address: Specific location or neighborhood mentioned

Rules:
- If you cannot determine the type, default to "LOST".
- If location is missing, set address to "Unknown".
"""

    try:
        # Pick a stable model; flash is fast/cheap for extraction.
        # (You can swap to another Gemini model later.)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        )

        raw = (response.text or "").strip()

        # Safety: if the model still wraps in fences, strip them
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw).strip()

        data = json.loads(raw)

        # Basic normalization / defaults
        if data.get("type") not in ("LOST", "FOUND"):
            data["type"] = "LOST"

        data.setdefault("title", "Reported via SMS")
        data.setdefault("description", text)
        data.setdefault("category", "General")
        data.setdefault("address", "Unknown")

        return data

    except Exception as e:
        print(f"Gemini Processing Error: {e}")
        return None


@app.route("/api/health", methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is reachable"})

@app.route("/sms", methods=['POST'])
def sms_reply():
    """Incoming SMS Webhook for Twilio."""
    msg_body = request.form.get('Body', '')
    from_number = request.form.get('From', '')

    print(f"Processing SMS from {from_number}: {msg_body}")

    # Process with AI
    extracted = extract_item_with_gemini(msg_body)
    
    if extracted:
        new_item = {
            "id": os.urandom(4).hex(),
            "type": extracted.get("type", "LOST"),
            "title": extracted.get("title", "Reported via SMS"),
            "description": extracted.get("description", msg_body),
            "category": extracted.get("category", "General"),
            "location": {"lat": 0, "lng": 0, "address": extracted.get("address", "Unknown")},
            "date": "2024-05-20T10:30:00Z", 
            "source": "SMS",
            "contactInfo": from_number
        }
        item_registry.insert(0, new_item)
        response_text = f"FindIt AI: Registered your {new_item['type'].lower()} item '{new_item['title']}'. We'll alert you if a match is found!"
    else:
        response_text = "FindIt AI: We received your message but couldn't parse the details. Try: 'I found a set of keys at the park'."

    resp = MessagingResponse()
    resp.message(response_text)
    return str(resp)

@app.route("/api/items", methods=['GET'])
def get_items():
    return jsonify(item_registry)

if __name__ == "__main__":
    print("--- FindIt AI Python Backend Starting ---")
    print("Ensure API_KEY is set in your environment.")
    app.run(port=5000, debug=True)