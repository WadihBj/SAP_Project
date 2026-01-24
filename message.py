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


def extract_item_with_gemini_image(image_bytes: bytes, mime_type: str, caption_text: str = ""):
    """
    Uses Gemini to analyze an incoming MMS image (+ optional caption) and extract a structured JSON item.
    """
    prompt = f"""
You are a lost and found assistant. Analyze the attached IMAGE and extract item details.
If the SMS caption provides extra context, use it.

SMS caption (may be empty): "{caption_text}"

Return ONLY a JSON object with these keys:
- type: "LOST" or "FOUND"
- title: Short descriptive name (3-5 words)
- description: What you see + any details inferred from caption (color, brand, distinguishing marks, etc.)
- category: One word category (e.g. Electronics, Pets, Wallet, Keys, Clothing)
- address: Specific location or neighborhood mentioned in caption; if unknown set "Unknown"

Rules:
- If you cannot determine the type, default to "LOST".
- If location is missing, set address to "Unknown".
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_bytes,
                            }
                        },
                    ],
                }
            ],
            config={
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        )

        raw = (response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw).strip()
        data = json.loads(raw)

        if data.get("type") not in ("LOST", "FOUND"):
            data["type"] = "LOST"

        data.setdefault("title", "Reported via MMS")
        data.setdefault("description", caption_text or "Image report")
        data.setdefault("category", "General")
        data.setdefault("address", "Unknown")

        return data

    except Exception as e:
        print(f"Gemini Image Processing Error: {e}")
        return None



@app.route("/api/health", methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is reachable"})

@app.route("/sms", methods=['POST'])
def sms_reply():
    """Incoming SMS/MMS Webhook for Twilio."""
    msg_body = request.form.get('Body', '') or ""
    from_number = request.form.get('From', '') or ""
    num_media = int(request.form.get('NumMedia', '0') or "0")

    print(f"Incoming from {from_number} | Body: {msg_body} | NumMedia: {num_media}")

    extracted = None

    # If MMS has media, try processing the first image
    if num_media > 0:
        media_url = request.form.get('MediaUrl0')
        media_type = request.form.get('MediaContentType0', '')

        print(f"MediaUrl0: {media_url}")
        print(f"MediaContentType0: {media_type}")

        if media_url and media_type.startswith("image/"):
            try:
                # Twilio media URLs require Basic Auth with Account SID + Auth Token
                r = requests.get(
                    media_url,
                    auth=HTTPBasicAuth(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                    timeout=20,
                )
                r.raise_for_status()
                image_bytes = r.content

                print("Downloaded bytes:", len(image_bytes))

                extracted = extract_item_with_gemini_image(
                    image_bytes=image_bytes,
                    mime_type=media_type,
                    caption_text=msg_body.strip(),
                )
                print("Extracted:", extracted)


            except Exception as e:
                print(f"Failed to download/process MMS image: {e}")
                extracted = None
        else:
            print("MMS received but not an image/* type (or missing URL).")

    # Fallback: normal SMS text parsing
    if extracted is None:
        extracted = extract_item_with_gemini(msg_body)
        print("Extracted:", extracted)


    # Register item
    if extracted:
        new_item = {
            "id": os.urandom(4).hex(),
            "type": extracted.get("type", "LOST"),
            "title": extracted.get("title", "Reported via SMS"),
            "description": extracted.get("description", msg_body),
            "category": extracted.get("category", "General"),
            "location": {"lat": 0, "lng": 0, "address": extracted.get("address", "Unknown")},
            "date": "2024-05-20T10:30:00Z",
            "source": "MMS" if num_media > 0 else "SMS",
            "contactInfo": from_number
        }
        item_registry.insert(0, new_item)
        response_text = f"FindIt AI: Registered your {new_item['type'].lower()} item '{new_item['title']}'. We'll alert you if a match is found!"
    else:
        response_text = "FindIt AI: I received your message but couldn't extract details. Try adding a caption like 'Found keys near Concordia library' with the photo."

    print("Reply text:", response_text)
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