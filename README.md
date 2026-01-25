# LOFO – Lost & Found Assistant

Web + SMS flow to log lost-item inquiries, auto-generate short pickup IDs, match them against a catalog, and let staff resolve items from a React dashboard.

## Features
- Upload lost items with images, names, descriptions
- Auto `short_id` + inquiry number for follow-up
- AI parsing of SMS/MMS into structured inquiries
- Search/filter catalog; mark items found with founder name + linked inquiry ID
- Users can text `<SHORT_ID> status` to check progress

## Stack
- Frontend: React 18, TypeScript, Vite, Tailwind
- Backend: Flask + Twilio SMS/MMS webhook
- Data: Supabase (Postgres + storage), optional Gemini for text/image parsing

## Quick Start (frontend)
```bash
npm install
npm run dev
```
Frontend runs on Vite’s default port (check console output).

## Backend (Flask)
```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python message.py
```

## Environment
Frontend (`.env.local`):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000   # Flask API
```
Backend (`.env` or export):
```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...           # optional for AI parsing
```

## Database
Run `supabase-setup.sql` in the Supabase SQL editor. It creates:
- `lost_items` with status/founder info
- `user_inquiries` with `short_id` + `inquiry_number`
- `inquiry_matches` linking items ↔ inquiries
- Storage bucket `item-images` with permissive policies

## Usage
- Add items via dashboard.
- Mark as found → enter founder name + user short_id; dashboard shows inquiry ID beside founder.
- Users text a report → they get a short_id back; texting `<SHORT_ID> status` returns current status.

## What’s next
- Notify users when a match is approved
- Better image similarity for matches
- Public “check item” page for self-serve lookups

