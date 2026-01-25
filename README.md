# Lost & Found - Assistant Portal

A web application for assistants to manage lost and found items using Supabase.

## Features

- 📤 Upload lost items with pictures, names, and descriptions
- 🔍 Search and filter items
- ✅ Mark items as found with founder name
- 📱 Responsive design

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

You need to create the following table and storage bucket in your Supabase project:

#### Create the `lost_items` table:

Run this SQL in your Supabase SQL Editor:

```sql
-- Create lost_items table
CREATE TABLE lost_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'lost' CHECK (status IN ('lost', 'found')),
  founder_name TEXT,
  found_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (optional, adjust policies as needed)
ALTER TABLE lost_items ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations" ON lost_items
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

#### Create the Storage Bucket:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `item-images`
3. Make it public (or adjust policies as needed)
4. Add a policy to allow uploads:

```sql
-- Storage policy for item-images bucket
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Allow public access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'item-images');
```

### 3. Environment Variables

The `.env.local` file should already be configured with your Supabase credentials. If not, create it:

```
VITE_SUPABASE_URL=https://crlqdhmuzdndlwntckya.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_v1KbiYURT2DJcaFKEU2Mjg_U9kwuapq
```

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://127.0.0.1:8080`

## Usage

1. **Upload Lost Items**: Fill in the item name, description, and optionally upload a picture
2. **View All Items**: All items are displayed in a grid below the upload form
3. **Search Items**: Use the search bar to filter items by name or description
4. **Mark as Found**: Click "Mark as Found" on any lost item, then enter the founder's name

## Technologies

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- React Router
