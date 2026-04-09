import os
import json
import re
import random
import string
from flask import Flask, request, jsonify
from flask_cors import CORS
from twilio.twiml.messaging_response import MessagingResponse
from google import genai
import requests
from requests.auth import HTTPBasicAuth
from supabase import create_client, Client
from typing import Optional, List, Dict
import base64

app = Flask(__name__)
CORS(app)

# Environment variables (prefer env, fall back to None)
TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") 
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

# Initialize clients
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable not set.")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Supabase credentials not set.")

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
supabase: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None


def extract_item_with_gemini(text: str) -> Optional[Dict]:
    """Uses Gemini to extract structured data from SMS text."""
    if not gemini_client:
        return None
        
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
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
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

        data.setdefault("title", "Reported via SMS")
        data.setdefault("description", text)
        data.setdefault("category", "General")
        data.setdefault("address", "Unknown")

        return data
    except Exception as e:
        print(f"Gemini Processing Error: {e}")
        return None


def extract_item_with_gemini_image(image_bytes: bytes, mime_type: str, caption_text: str = "") -> Optional[Dict]:
    """Uses Gemini to analyze MMS image and extract structured data."""
    if not gemini_client:
        return None
        
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
        response = gemini_client.models.generate_content(
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


def upload_image_to_supabase(image_bytes: bytes, file_name: str) -> Optional[str]:
    """Upload image to Supabase storage and return public URL."""
    if not supabase:
        return None
        
    try:
        file_path = f"inquiry-images/{file_name}"
        
        # Upload to Supabase storage
        result = supabase.storage.from_("item-images").upload(
            file_path,
            image_bytes,
            file_options={"content-type": "image/jpeg", "upsert": "true"}
        )
        
        if result:
            # Get public URL
            url_data = supabase.storage.from_("item-images").get_public_url(file_path)
            return url_data
    except Exception as e:
        print(f"Error uploading image to Supabase: {e}")
        return None
    
    return None


def generate_short_id() -> str:
    """Generate a unique 5-character alphanumeric ID."""
    characters = string.ascii_uppercase + string.digits
    # Exclude confusing characters: 0, O, I, 1
    characters = characters.replace('0', '').replace('O', '').replace('I', '').replace('1', '')
    return ''.join(random.choices(characters, k=5))


def ensure_unique_short_id() -> str:
    """Generate a unique short_id that doesn't exist in the database."""
    if not supabase:
        return generate_short_id()
    
    max_attempts = 10
    for _ in range(max_attempts):
        short_id = generate_short_id()
        # Check if it exists
        result = supabase.table("user_inquiries").select("id").eq("short_id", short_id).execute()
        if not result.data or len(result.data) == 0:
            return short_id
    
    # Fallback: add random suffix if all attempts fail
    return generate_short_id() + str(random.randint(10, 99))[:1]


def find_matches_with_ai(inquiry_data: Dict, inquiry_id: str) -> List[Dict]:
    """Use AI to match inquiry against lost_items in database."""
    if not supabase or not gemini_client:
        return []
    
    try:
        # Get all lost items from database, excluding items that are already "found"
        response = supabase.table("lost_items").select("*").neq("status", "found").execute()
        lost_items = response.data if response.data else []
        
        if not lost_items:
            return []
        
        # Prepare items for AI comparison
        items_text = "\n\n".join([
            f"Item {idx + 1}:\n"
            f"Name: {item.get('item_name', 'N/A')}\n"
            f"Description: {item.get('description', 'N/A')}\n"
            f"Status: {item.get('status', 'N/A')}\n"
            f"Image: {item.get('image_url', 'No image')}"
            for idx, item in enumerate(lost_items)
        ])
        
        inquiry_text = f"""
User Inquiry:
Title: {inquiry_data.get('title', 'N/A')}
Description: {inquiry_data.get('description', 'N/A')}
Category: {inquiry_data.get('category', 'N/A')}
Type: {inquiry_data.get('type', 'LOST')}
"""
        
        prompt = f"""
You are a lost and found matching system. Compare the user inquiry against the catalog of lost items.

{inquiry_text}

Lost Items Catalog:
{items_text}

For each item in the catalog, determine:
1. How similar is it to the user's inquiry? (0-100 score)
2. Why is it a match or not? (brief reasoning)

Return ONLY a JSON array of objects, each with:
- item_index: The index number (1-based) of the item from the catalog
- confidence_score: A number between 0-100 indicating match confidence
- reasoning: Brief explanation of why this is/isn't a match

Only include items with confidence_score >= 30. Sort by confidence_score descending.
Return at most 5 matches.
"""
        
        ai_response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.3,
            },
        )
        
        raw = (ai_response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw).strip()
        matches = json.loads(raw)
        
        if not isinstance(matches, list):
            matches = [matches] if matches else []
        
        # Store matches in database
        match_records = []
        for match in matches:
            item_idx = match.get('item_index', 1) - 1  # Convert to 0-based
            if 0 <= item_idx < len(lost_items):
                lost_item = lost_items[item_idx]
                
                # Insert match record
                match_data = {
                    "inquiry_id": inquiry_id,
                    "lost_item_id": lost_item['id'],
                    "confidence_score": float(match.get('confidence_score', 0)),
                    "ai_reasoning": match.get('reasoning', 'No reasoning provided')
                }
                
                try:
                    result = supabase.table("inquiry_matches").insert(match_data).execute()
                    if result.data:
                        match_records.append({
                            **match_data,
                            "lost_item": lost_item
                        })
                except Exception as e:
                    print(f"Error storing match: {e}")
        
        return match_records
        
    except Exception as e:
        print(f"Error in AI matching: {e}")
        return []


def find_inquiries_for_item(lost_item: Dict) -> List[Dict]:
    """Use AI to match a new lost item against existing inquiries."""
    if not supabase or not gemini_client:
        return []
    
    try:
        # Get all inquiries that don't have status "resolved"
        response = supabase.table("user_inquiries").select("*").neq("status", "resolved").execute()
        inquiries = response.data if response.data else []
        
        if not inquiries:
            return []
        
        # Prepare inquiries for AI comparison
        inquiries_text = "\n\n".join([
            f"Inquiry {idx + 1}:\n"
            f"Title: {inq.get('extracted_title', 'N/A')}\n"
            f"Description: {inq.get('extracted_description', inq.get('sms_text', 'N/A'))}\n"
            f"Category: {inq.get('extracted_category', 'N/A')}\n"
            f"Type: {inq.get('extracted_type', 'N/A')}\n"
            f"Images: {', '.join(inq.get('image_urls', []) or [])}"
            for idx, inq in enumerate(inquiries)
        ])
        
        item_text = f"""
New Lost Item:
Name: {lost_item.get('item_name', 'N/A')}
Description: {lost_item.get('description', 'N/A')}
Image: {lost_item.get('image_url', 'No image')}
"""
        
        prompt = f"""
You are a lost and found matching system. Compare the new lost item against existing user inquiries.

{item_text}

Existing User Inquiries:
{inquiries_text}

For each inquiry, determine:
1. How similar is it to the new lost item? (0-100 score)
2. Why is it a match or not? (brief reasoning)

Return ONLY a JSON array of objects, each with:
- inquiry_index: The index number (1-based) of the inquiry
- confidence_score: A number between 0-100 indicating match confidence
- reasoning: Brief explanation of why this is/isn't a match

Only include inquiries with confidence_score >= 30. Sort by confidence_score descending.
Return at most 5 matches.
"""
        
        ai_response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.3,
            },
        )
        
        raw = (ai_response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw).strip()
        matches = json.loads(raw)
        
        if not isinstance(matches, list):
            matches = [matches] if matches else []
        
        # Store matches in database
        match_records = []
        for match in matches:
            inquiry_idx = match.get('inquiry_index', 1) - 1  # Convert to 0-based
            if 0 <= inquiry_idx < len(inquiries):
                inquiry = inquiries[inquiry_idx]
                
                # Check if match already exists
                existing_match = supabase.table("inquiry_matches").select("*").eq(
                    "inquiry_id", inquiry['id']
                ).eq("lost_item_id", lost_item['id']).execute()
                
                if existing_match.data and len(existing_match.data) > 0:
                    # Match already exists, skip
                    continue
                
                # Insert match record
                match_data = {
                    "inquiry_id": inquiry['id'],
                    "lost_item_id": lost_item['id'],
                    "confidence_score": float(match.get('confidence_score', 0)),
                    "ai_reasoning": match.get('reasoning', 'No reasoning provided')
                }
                
                try:
                    result = supabase.table("inquiry_matches").insert(match_data).execute()
                    if result.data:
                        match_records.append({
                            **match_data,
                            "inquiry": inquiry
                        })
                        
                        # Update inquiry status and confidence if matches found
                        if inquiry.get('status') == 'submitted':
                            # Calculate average confidence for this inquiry
                            all_matches = supabase.table("inquiry_matches").select(
                                "confidence_score"
                            ).eq("inquiry_id", inquiry['id']).execute()
                            
                            if all_matches.data:
                                avg_confidence = sum(
                                    m.get('confidence_score', 0) for m in all_matches.data
                                ) / len(all_matches.data)
                                
                                supabase.table("user_inquiries").update({
                                    "ai_confidence": avg_confidence,
                                    "status": "matched"
                                }).eq("id", inquiry['id']).execute()
                except Exception as e:
                    print(f"Error storing match for inquiry {inquiry['id']}: {e}")
        
        return match_records
        
    except Exception as e:
        print(f"Error in AI matching for new item: {e}")
        return []


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

    # Quick status lookup: "<SHORT_ID> status"
    normalized_body = msg_body.strip()
    status_match = re.match(r"^([A-Za-z0-9]{4,10})\s+status$", normalized_body, re.IGNORECASE)
    if status_match:
        lookup_id = status_match.group(1).upper()
        if supabase:
            try:
                inquiry = supabase.table("user_inquiries") \
                    .select("status, inquiry_number, short_id") \
                    .eq("short_id", lookup_id) \
                    .single() \
                    .execute()

                if inquiry.data:
                    status_val = inquiry.data.get("status", "unknown").title()
                    inquiry_number = inquiry.data.get("inquiry_number", "N/A")
                    resp = MessagingResponse()
                    resp.message(f"FindIt AI: Status for {lookup_id} (Ref #{inquiry_number}): {status_val}")
                    return str(resp)
                else:
                    resp = MessagingResponse()
                    resp.message(f"FindIt AI: I couldn't find an inquiry with ID {lookup_id}. Please check and try again.")
                    return str(resp)
            except Exception as e:
                print(f"Status lookup failed for {lookup_id}: {e}")
                resp = MessagingResponse()
                resp.message("FindIt AI: Sorry, I couldn't retrieve that status right now. Please try again later.")
                return str(resp)
        else:
            resp = MessagingResponse()
            resp.message("FindIt AI: Status lookup is unavailable (database not configured).")
            return str(resp)

    extracted = None
    image_urls = []
    short_id: Optional[str] = None

    # Always generate a short_id to return to the user, even if parsing fails
    try:
        short_id = ensure_unique_short_id()
    except Exception as e:
        # If we cannot guarantee uniqueness (e.g., Supabase down), still generate a local ID
        print(f"Failed to generate short_id uniquely, falling back: {e}")
        short_id = generate_short_id()

    # Process MMS images
    if num_media > 0:
        for i in range(num_media):
            media_url = request.form.get(f'MediaUrl{i}')
            media_type = request.form.get(f'MediaContentType{i}', '')

            if media_url and media_type.startswith("image/"):
                try:
                    # Download image from Twilio
                    auth = HTTPBasicAuth(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN else None
                    r = requests.get(
                        media_url,
                        auth=auth,
                        timeout=20,
                    )
                    r.raise_for_status()
                    image_bytes = r.content

                    # Upload to Supabase
                    file_name = f"{from_number.replace('+', '')}_{i}_{os.urandom(4).hex()}.jpg"
                    image_url = upload_image_to_supabase(image_bytes, file_name)
                    if image_url:
                        image_urls.append(image_url)

                    # Extract data from first image
                    if i == 0:
                        extracted = extract_item_with_gemini_image(
                            image_bytes=image_bytes,
                            mime_type=media_type,
                            caption_text=msg_body.strip(),
                        )
                except Exception as e:
                    print(f"Failed to download/process MMS image {i}: {e}")

    # Fallback: normal SMS text parsing
    if extracted is None:
        extracted = extract_item_with_gemini(msg_body)

    # Save inquiry to database
    inquiry_id = None
    inquiry_number = None
    
    if supabase:
        try:
            inquiry_data = {
                "phone_number": from_number,
                "sms_text": msg_body,
                "image_urls": image_urls,
                "extracted_title": (extracted or {}).get("title", "Reported via SMS"),
                "extracted_description": (extracted or {}).get("description", msg_body),
                "extracted_category": (extracted or {}).get("category", "General"),
                "extracted_type": (extracted or {}).get("type", "LOST"),
                "status": "submitted",
                "short_id": short_id
            }
            
            result = supabase.table("user_inquiries").insert(inquiry_data).execute()
            
            if result.data and len(result.data) > 0:
                inquiry_id = result.data[0]['id']
                inquiry_number = result.data[0]['inquiry_number']
                # Get short_id from result or use the one we generated
                returned_short_id = result.data[0].get('short_id', short_id)
                
                # Find matches using AI when we have extracted data
                matches = find_matches_with_ai(extracted, inquiry_id) if extracted else []
                
                # Calculate average confidence if matches found
                if matches:
                    avg_confidence = sum(m.get('confidence_score', 0) for m in matches) / len(matches)
                    supabase.table("user_inquiries").update({
                        "ai_confidence": avg_confidence,
                        "status": "matched"
                    }).eq("id", inquiry_id).execute()
                
                # Always include the inquiry ID in the response
                response_text = f"FindIt AI: Thank you! Your inquiry has been registered.\n\nYour Inquiry ID: {returned_short_id}\nReference: #{inquiry_number}\n\n{'We found potential matches!' if matches else 'We\'re checking our database for matches.'}"
            else:
                # Even if insert failed, try to provide the short_id if we have it
                response_text = f"FindIt AI: Thank you for your inquiry. We're processing it now. Your Inquiry ID: {short_id or 'N/A'}"
        except Exception as e:
            print(f"Error saving inquiry: {e}")
            # Try to include short_id even in error case if we generated it
            if short_id:
                response_text = f"FindIt AI: I received your message. Processing... Your Inquiry ID: {short_id}"
            else:
                response_text = "FindIt AI: I received your message. Processing..."
    else:
        response_text = f"FindIt AI: I received your message. Your Inquiry ID: {short_id or 'N/A'}\nWe're processing it now."

    resp = MessagingResponse()
    resp.message(response_text)
    return str(resp)


@app.route("/api/inquiries", methods=['GET'])
def get_inquiries():
    """Get all inquiries (for assistant dashboard)."""
    if not supabase:
        return jsonify({"error": "Supabase not configured"}), 500
    
    try:
        status = request.args.get('status', None)
        query = supabase.table("user_inquiries").select("*")
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).execute()
        return jsonify(result.data if result.data else [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/inquiries/<inquiry_number>", methods=['GET'])
def get_inquiry_by_number(inquiry_number: int):
    """Get inquiry by number with matches."""
    if not supabase:
        return jsonify({"error": "Supabase not configured"}), 500
    
    try:
        # Get inquiry
        inquiry_result = supabase.table("user_inquiries").select("*").eq("inquiry_number", inquiry_number).execute()
        
        if not inquiry_result.data or len(inquiry_result.data) == 0:
            return jsonify({"error": "Inquiry not found"}), 404
        
        inquiry = inquiry_result.data[0]
        
        # Get matches, filtering out items with status "found"
        matches_result = supabase.table("inquiry_matches").select(
            "*, lost_items(*)"
        ).eq("inquiry_id", inquiry['id']).order("confidence_score", desc=True)
        
        # Filter out matches where the lost_item status is "found"
        matches = matches_result.data if matches_result.data else []
        filtered_matches = [
            match for match in matches 
            if match.get('lost_items', {}).get('status') != 'found'
        ]
        
        inquiry['matches'] = filtered_matches
        
        return jsonify(inquiry)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/match-item", methods=['POST'])
def match_item():
    """Match a newly uploaded item against existing inquiries."""
    if not supabase:
        return jsonify({"error": "Supabase not configured"}), 500
    
    try:
        data = request.get_json()
        item_id = data.get('item_id')
        
        if not item_id:
            return jsonify({"error": "item_id is required"}), 400
        
        # Get the lost item
        item_result = supabase.table("lost_items").select("*").eq("id", item_id).execute()
        
        if not item_result.data or len(item_result.data) == 0:
            return jsonify({"error": "Item not found"}), 404
        
        lost_item = item_result.data[0]
        
        # Skip if item is already "found"
        if lost_item.get('status') == 'found':
            return jsonify({"message": "Item is already marked as found, skipping matching"}), 200
        
        # Find matching inquiries
        matches = find_inquiries_for_item(lost_item)
        
        return jsonify({
            "message": f"Found {len(matches)} matching inquiries",
            "matches": len(matches)
        }), 200
        
    except Exception as e:
        print(f"Error matching item: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("--- FindIt AI Python Backend Starting ---")
    print("Ensure environment variables are set:")
    print("  - TWILIO_ACCOUNT_SID")
    print("  - TWILIO_AUTH_TOKEN")
    print("  - GEMINI_API_KEY")
    print("  - SUPABASE_URL")
    print("  - SUPABASE_SERVICE_ROLE_KEY")
    app.run(port=5000, debug=True)
