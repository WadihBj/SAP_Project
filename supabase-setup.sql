-- Lost & Found Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create lost_items table
CREATE TABLE IF NOT EXISTS lost_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'match found', 'found')),
  founder_name TEXT,
  found_at TIMESTAMP WITH TIME ZONE
);

-- If table already exists, update the status constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE lost_items DROP CONSTRAINT IF EXISTS lost_items_status_check;
  
  -- Add new constraint with all statuses
  ALTER TABLE lost_items ADD CONSTRAINT lost_items_status_check 
    CHECK (status IN ('submitted', 'match found', 'found'));
  
  -- Update default status if needed
  ALTER TABLE lost_items ALTER COLUMN status SET DEFAULT 'submitted';
EXCEPTION
  WHEN OTHERS THEN
    -- Table might not exist yet, that's okay
    NULL;
END $$;

-- Enable Row Level Security
ALTER TABLE lost_items ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations
-- Note: Adjust this based on your security requirements
CREATE POLICY "Allow all operations on lost_items" ON lost_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for item images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for item-images bucket
-- Run these after creating the bucket in the dashboard
CREATE POLICY "Allow public uploads to item-images" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Allow public access to item-images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'item-images');

-- Optional: Create an index for better search performance
CREATE INDEX IF NOT EXISTS idx_lost_items_status ON lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_items_item_name ON lost_items(item_name);
CREATE INDEX IF NOT EXISTS idx_lost_items_created_at ON lost_items(created_at DESC);

-- Create user_inquiries table for SMS/MMS inquiries
CREATE TABLE IF NOT EXISTS user_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_number SERIAL UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  phone_number TEXT NOT NULL,
  sms_text TEXT,
  image_urls TEXT[],
  extracted_title TEXT,
  extracted_description TEXT,
  extracted_category TEXT,
  extracted_type TEXT CHECK (extracted_type IN ('LOST', 'FOUND')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'matched', 'resolved')),
  ai_confidence REAL,
  assistant_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create matches table to store AI matching results
CREATE TABLE IF NOT EXISTS inquiry_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id UUID NOT NULL REFERENCES user_inquiries(id) ON DELETE CASCADE,
  lost_item_id UUID NOT NULL REFERENCES lost_items(id) ON DELETE CASCADE,
  confidence_score REAL NOT NULL,
  ai_reasoning TEXT,
  assistant_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(inquiry_id, lost_item_id)
);

-- Enable Row Level Security for new tables
ALTER TABLE user_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_matches ENABLE ROW LEVEL SECURITY;

-- Create policies for user_inquiries
CREATE POLICY "Allow all operations on user_inquiries" ON user_inquiries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for inquiry_matches
CREATE POLICY "Allow all operations on inquiry_matches" ON inquiry_matches
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_inquiries_status ON user_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_user_inquiries_phone ON user_inquiries(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_inquiries_created_at ON user_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiry_matches_inquiry_id ON inquiry_matches(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_matches_lost_item_id ON inquiry_matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_matches_confidence ON inquiry_matches(confidence_score DESC);
