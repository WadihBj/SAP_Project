# FindIt AI - Lost & Found Platform

A comprehensive lost and found management system with SMS integration, AI-powered matching, and web dashboard.

## 🎯 Features

- **SMS-Based Reporting**: Users can report lost/found items via SMS (text + images)
- **AI-Powered Matching**: Google Gemini AI automatically matches inquiries with database items
- **Real-time Status Checks**: Users can text an inquiry number to check status
- **Web Dashboard**: Assistant portal to manage items and inquiries
- **Image Upload**: Support for images via MMS with automatic Supabase storage
- **Responsive Design**: Works on mobile and desktop
- **Auto ID Generation**: Unique inquiry IDs for easy tracking

---

## 📋 Project Structure

```
SAP_Project/
├── client/                 # React + Vite frontend
│   ├── src/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── server/                 # Flask backend
│   ├── message.py          # Main Flask app with SMS handling
│   └── requirements.txt    # Python dependencies
├── .env.local              # Frontend env vars (Supabase keys)
└── README.md
```

---

## 🔧 Installation

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 16+** (for frontend)
- **pip** and **npm** package managers
- Accounts for: Twilio, Supabase, Google Cloud (Gemini API)

### Backend Setup

1. **Create Python Virtual Environment**
   ```bash
   cd server
   python -m venv .venv
   ```

2. **Activate Virtual Environment**
   
   **Windows:**
   ```bash
   .venv\Scripts\Activate.ps1
   ```
   
   **macOS/Linux:**
   ```bash
   source .venv/bin/activate
   ```

3. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. **Navigate to Client Directory**
   ```bash
   cd client
   ```

2. **Install Node Dependencies**
   ```bash
   npm install
   ```

3. **Create `.env.local` File**
   ```bash
   # In client/ directory
   VITE_SUPABASE_URL=https://your-project.supabase.co/
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## 🔐 Environment Variables

### Backend (Python) - Set in PowerShell or `.env` file

```bash
# Twilio
$env:TWILIO_ACCOUNT_SID = "your-account-sid"
$env:TWILIO_AUTH_TOKEN = "your-auth-token"

# Google Gemini API
$env:GEMINI_API_KEY = "your-gemini-api-key"

# Supabase
$env:SUPABASE_URL = "https://your-project.supabase.co/"
$env:SUPABASE_KEY = "your-supabase-key"
```

Or hardcode in `server/message.py` (not recommended for production):
```python
TWILIO_ACCOUNT_SID = "your-sid"
TWILIO_AUTH_TOKEN = "your-token"
GEMINI_API_KEY = "your-key"
SUPABASE_URL = "your-url"
SUPABASE_KEY = "your-key"
```

### Frontend (.env.local in `client/` directory)

```
VITE_SUPABASE_URL=https://your-project.supabase.co/
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📦 Dependencies

### Backend (Python)

| Package | Version | Purpose |
|---------|---------|---------|
| **flask** | ^2.3.0 | Web framework |
| **flask-cors** | ^4.0.0 | Cross-Origin Resource Sharing |
| **twilio** | ^8.0.0+ | SMS/MMS messaging |
| **google-genai** | latest | Google Gemini AI |
| **supabase** | ^2.0.0+ | Database client |
| **requests** | ^2.31.0 | HTTP requests |

**Install all:**
```bash
pip install flask flask-cors twilio google-genai supabase requests
```

### Frontend (Node.js)

| Package | Version | Purpose |
|---------|---------|---------|
| **react** | ^18.3.1 | UI framework |
| **react-dom** | ^18.3.1 | React DOM rendering |
| **react-router-dom** | ^6.30.1 | Client-side routing |
| **@supabase/supabase-js** | ^2.91.1 | Supabase client |
| **lucide-react** | ^0.539.0 | Icon library |
| **vite** | ^7.1.2 | Build tool |
| **tailwindcss** | ^3.4.17 | Utility CSS |
| **typescript** | ^5.9.2 | Type safety |

**Install all:**
```bash
npm install
```

---

## 🚀 Running the Application

### 1. Start Backend (Python)

**Terminal 1 - Backend:**
```bash
cd server
.venv\Scripts\Activate.ps1  # Windows
python message.py
```

You should see:
```
--- FindIt AI Python Backend Starting ---
 * Running on http://127.0.0.1:5000
```

### 2. Expose Backend with ngrok

**Terminal 2 - ngrok:**
```bash
cd (navigate to project root)
.\ngrok http 5000
```

Copy the **forwarding URL** (e.g., `https://abc123.ngrok.io`)

### 3. Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com)
2. **Phone Numbers** → Your number
3. **Messaging > A Message Comes In** → Set webhook to:
   ```
   https://your-ngrok-url/sms
   ```
4. Method: **POST**
5. Save

### 4. Start Frontend (React)

**Terminal 3 - Frontend:**
```bash
cd client
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

---

## 📱 How to Use

### For Users (SMS)

1. **Report Lost Item**
   ```
   Send SMS: "I lost my blue wallet at Concordia library"
   Response: Gets Inquiry #123, ID: ABC12
   ```

2. **Check Status**
   ```
   Send SMS: "123"
   Response: Shows current status, matches, confidence score
   ```

3. **Report with Image**
   ```
   Send MMS: Photo + Caption "Found keys at the park"
   Response: Gets Inquiry # and matches
   ```

### For Assistants (Web Dashboard)

1. Open `http://localhost:5173`
2. View all inquiries and items
3. Manage statuses
4. Upload new lost items
5. Monitor AI-matched inquiries

---

## 🔌 API Endpoints

### Health Check
```
GET /api/health
Response: { "status": "ok", "message": "Backend is reachable" }
```

### SMS Webhook (Twilio)
```
POST /sms
Body: Twilio form data (Body, From, NumMedia, etc.)
Response: TwiML XML
```

### Get All Inquiries
```
GET /api/inquiries?status=submitted
Response: Array of inquiries
```

### Get Inquiry Details
```
GET /api/inquiries/<inquiry_number>
Response: Inquiry with matches and lost items
```

### Match New Item
```
POST /api/match-item
Body: { "item_id": "uuid" }
Response: { "matches": count }
```

---

## 🗄️ Database Schema

### `user_inquiries` Table
```sql
- id (UUID)
- inquiry_number (Integer, auto-increment)
- short_id (String, unique)
- phone_number (String)
- sms_text (Text)
- image_urls (Array)
- extracted_title (String)
- extracted_description (Text)
- extracted_category (String)
- extracted_type (LOST/FOUND)
- status (submitted, matched, resolved)
- ai_confidence (Float 0-100)
- created_at (Timestamp)
- resolved_at (Timestamp)
```

### `lost_items` Table
```sql
- id (UUID)
- item_name (String)
- description (Text)
- image_url (String)
- status (lost/found)
- founder_name (String)
- found_at (Timestamp)
- created_at (Timestamp)
```

### `inquiry_matches` Table
```sql
- id (UUID)
- inquiry_id (FK)
- lost_item_id (FK)
- confidence_score (Float 0-100)
- ai_reasoning (Text)
- created_at (Timestamp)
```

---

## 🤖 AI Integration

### Extract Item Data
- **Model**: `gemini-2.5-flash`
- **Input**: SMS text or MMS image
- **Output**: JSON with type, title, description, category, address
- **Temperature**: 0.2 (deterministic)

### Find Matches
- **Model**: `gemini-2.5-flash`
- **Input**: Inquiry data vs. lost items catalog
- **Output**: Array of matches with confidence scores (0-100)
- **Threshold**: Only includes matches ≥ 30 confidence
- **Temperature**: 0.3 (balanced)

---

## 🔍 Troubleshooting

### Issue: SMS not being sent back

**Solution:**
1. Verify ngrok URL in Twilio webhook
2. Check that Flask backend is running
3. Look for errors in Python terminal
4. Test health endpoint: `http://localhost:5000/api/health`

### Issue: Supabase connection error

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_KEY` are set
2. Check Supabase project is active
3. Ensure tables exist (run `supabase-setup.sql`)

### Issue: Frontend can't reach backend

**Solution:**
1. Make sure ngrok is running
2. Check CORS is enabled in Flask
3. Verify frontend `.env.local` has correct URLs

### Issue: Gemini API not working

**Solution:**
1. Verify `GEMINI_API_KEY` is set
2. Check API key has Gemini access enabled
3. Review Google Cloud project quotas

---

## 📚 Additional Resources

- [Twilio Docs](https://www.twilio.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev)
- [Flask Documentation](https://flask.palletsprojects.com)
- [React Documentation](https://react.dev)

---

## 📄 License

MIT License - Feel free to use this project

---

## 👥 Support

For issues or questions, check the logs in the Python terminal for detailed error messages.

