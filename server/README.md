# SMS Backend Setup Guide

This Flask backend handles incoming SMS/MMS messages from Twilio, processes them with Gemini AI, and stores inquiries in Supabase.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd server
pip install -r requirements.txt
```

Or use a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the `server` directory with:

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://crlqdhmuzdndlwntckya.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important:** Use the **Service Role Key** (not the anon key) for `SUPABASE_SERVICE_ROLE_KEY`. You can find it in:
- Supabase Dashboard → Settings → API → `service_role` key

### 3. Run Database Migration

Run the updated `supabase-setup.sql` in your Supabase SQL Editor to create the `user_inquiries` and `inquiry_matches` tables.

### 4. Configure Twilio Webhook

1. Go to your Twilio Console
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Click on your phone number
4. In the "Messaging" section, set the webhook URL to:
   ```
   https://your-domain.com/sms
   ```
   Or for local testing with ngrok:
   ```
   https://your-ngrok-url.ngrok.io/sms
   ```

### 5. Run the Server

```bash
python sms_backend.py
```

The server will run on `http://localhost:5000`

### 6. Test Locally with ngrok

For local development, use ngrok to expose your local server:

```bash
ngrok http 5000
```

Then use the ngrok URL in your Twilio webhook configuration.

## How It Works

1. **User sends SMS/MMS** → Twilio receives it
2. **Twilio webhook** → Calls `/sms` endpoint
3. **AI Processing** → Gemini extracts item details from text/image
4. **Store Inquiry** → Saved to `user_inquiries` table
5. **AI Matching** → Compares inquiry against `lost_items` catalog
6. **Store Matches** → Saves matches with confidence scores to `inquiry_matches` table
7. **Assistant Review** → Assistant can view and approve matches in the dashboard

## API Endpoints

- `POST /sms` - Twilio webhook for incoming SMS/MMS
- `GET /api/health` - Health check endpoint
- `GET /api/inquiries` - Get all inquiries (for assistant dashboard)
- `GET /api/inquiries/<number>` - Get inquiry by number with matches

## Features

- ✅ SMS text extraction with Gemini AI
- ✅ MMS image analysis with Gemini Vision
- ✅ Automatic matching against lost items catalog
- ✅ Confidence scoring for matches
- ✅ Image storage in Supabase
- ✅ Inquiry tracking with status
