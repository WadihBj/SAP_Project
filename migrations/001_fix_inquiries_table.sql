-- Production-Grade Schema Migration
-- Run this in Supabase SQL Editor to set up coherent, well-ordered tables

-- ============================================================================
-- PHASE 1: CORE TABLES
-- ============================================================================

-- Enhance inquiries table with missing columns and audit fields
ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS description_quality TEXT DEFAULT 'fair',
ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS extracted_attributes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS fraud_risk_score NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT FALSE;

-- Ensure status has proper default and constraint
ALTER TABLE inquiries ALTER COLUMN status SET DEFAULT 'submitted';
ALTER TABLE inquiries ADD CONSTRAINT inquiries_status_check 
  CHECK (status IN ('submitted', 'under_review', 'matched', 'resolved', 'rejected')) 
  NOT VALID;

-- ============================================================================
-- PHASE 2: RELATED TABLES WITH PROPER RELATIONSHIPS
-- ============================================================================

-- Inquiry Images Table
CREATE TABLE IF NOT EXISTS inquiry_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'image/jpeg',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_mime_type CHECK (mime_type LIKE 'image/%')
);

-- Inquiry Status History Table (audit trail)
CREATE TABLE IF NOT EXISTS inquiry_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_new_status CHECK (new_status IN ('submitted', 'under_review', 'matched', 'resolved', 'rejected'))
);

-- Matches Table (inquiry to inventory item mapping)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  confidence_score NUMERIC(5,4) DEFAULT 0,
  final_confidence NUMERIC(5,4) DEFAULT 0,
  status TEXT DEFAULT 'pending_review',
  matching_details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_match_status CHECK (status IN ('pending_review', 'verification_submitted', 'verified', 'rejected', 'resolved')),
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT valid_final_confidence CHECK (final_confidence >= 0 AND final_confidence <= 1),
  CONSTRAINT unique_inquiry_item UNIQUE (inquiry_id, inventory_item_id)
);

-- Match Verification Responses Table (ownership verification)
CREATE TABLE IF NOT EXISTS match_verification_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  verification_status TEXT DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  CONSTRAINT valid_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected', 'inconclusive'))
);

-- Inquiry Follow-ups Table (for match narrowing when >5 matches)
CREATE TABLE IF NOT EXISTS inquiry_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  question_set INTEGER NOT NULL,
  responses JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHASE 3: PERFORMANCE INDEXES
-- ============================================================================

-- Inquiries Indexes
CREATE INDEX IF NOT EXISTS inquiries_user_id_idx ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries(status);
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_fraud_risk_idx ON inquiries(fraud_risk_score DESC);

-- Inquiry Images Indexes
CREATE INDEX IF NOT EXISTS inquiry_images_inquiry_id_idx ON inquiry_images(inquiry_id);
CREATE INDEX IF NOT EXISTS inquiry_images_created_at_idx ON inquiry_images(created_at DESC);

-- Status History Indexes
CREATE INDEX IF NOT EXISTS inquiry_status_history_inquiry_id_idx ON inquiry_status_history(inquiry_id);
CREATE INDEX IF NOT EXISTS inquiry_status_history_created_at_idx ON inquiry_status_history(created_at DESC);

-- Matches Indexes
CREATE INDEX IF NOT EXISTS matches_inquiry_id_idx ON matches(inquiry_id);
CREATE INDEX IF NOT EXISTS matches_inventory_item_id_idx ON matches(inventory_item_id);
CREATE INDEX IF NOT EXISTS matches_status_idx ON matches(status);
CREATE INDEX IF NOT EXISTS matches_confidence_idx ON matches(final_confidence DESC);
CREATE INDEX IF NOT EXISTS matches_created_at_idx ON matches(created_at DESC);

-- Verification Indexes
CREATE INDEX IF NOT EXISTS match_verification_match_id_idx ON match_verification_responses(match_id);
CREATE INDEX IF NOT EXISTS match_verification_status_idx ON match_verification_responses(verification_status);

-- Follow-ups Index
CREATE INDEX IF NOT EXISTS inquiry_follow_ups_inquiry_id_idx ON inquiry_follow_ups(inquiry_id);

-- ============================================================================
-- PHASE 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_verification_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_follow_ups ENABLE ROW LEVEL SECURITY;

-- Users can view only their own inquiries
DROP POLICY IF EXISTS inquiries_user_access ON inquiries;
CREATE POLICY inquiries_user_access ON inquiries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS inquiries_user_insert ON inquiries;
CREATE POLICY inquiries_user_insert ON inquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view images for their inquiries
DROP POLICY IF EXISTS inquiry_images_access ON inquiry_images;
CREATE POLICY inquiry_images_access ON inquiry_images
  FOR SELECT USING (
    inquiry_id IN (
      SELECT id FROM inquiries WHERE user_id = auth.uid()
    )
  );

-- Users can view status history for their inquiries
DROP POLICY IF EXISTS status_history_access ON inquiry_status_history;
CREATE POLICY status_history_access ON inquiry_status_history
  FOR SELECT USING (
    inquiry_id IN (
      SELECT id FROM inquiries WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PHASE 5: DATA VALIDATION TRIGGERS
-- ============================================================================

-- Create updated_at trigger for matches table
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 6: MATERIALIZED VIEWS FOR ANALYTICS (OPTIONAL)
-- ============================================================================

-- User activity summary
DROP MATERIALIZED VIEW IF EXISTS user_inquiry_summary CASCADE;
CREATE MATERIALIZED VIEW user_inquiry_summary AS
SELECT 
  i.user_id,
  COUNT(DISTINCT i.id) as total_inquiries,
  COUNT(DISTINCT CASE WHEN i.status = 'resolved' THEN i.id END) as resolved_inquiries,
  COUNT(DISTINCT CASE WHEN i.status = 'matched' THEN i.id END) as matched_inquiries,
  COUNT(DISTINCT m.id) as total_matches,
  AVG(m.final_confidence) as avg_match_confidence,
  MAX(i.created_at) as last_inquiry_date
FROM inquiries i
LEFT JOIN matches m ON i.id = m.inquiry_id
GROUP BY i.user_id;

-- Match success rate by category
DROP MATERIALIZED VIEW IF EXISTS match_success_by_category CASCADE;
CREATE MATERIALIZED VIEW match_success_by_category AS
SELECT 
  i.extracted_attributes->>'category' as category,
  COUNT(m.id) as total_matches,
  COUNT(DISTINCT CASE WHEN m.status = 'verified' THEN m.id END) as verified_matches,
  AVG(m.final_confidence) as avg_confidence,
  (COUNT(DISTINCT CASE WHEN m.status = 'verified' THEN m.id END)::FLOAT / NULLIF(COUNT(m.id), 0)) as success_rate
FROM matches m
JOIN inquiries i ON m.inquiry_id = i.id
GROUP BY i.extracted_attributes->>'category';

-- ============================================================================
-- PHASE 7: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE inquiries IS 'Core inquiry records for lost/found items';
COMMENT ON COLUMN inquiries.fraud_risk_score IS 'Rate limiting fraud detection (0-100)';
COMMENT ON COLUMN inquiries.requires_verification IS 'Flag for ownership verification needed';
COMMENT ON TABLE matches IS 'Potential matches between inquiries and inventory items';
COMMENT ON TABLE match_verification_responses IS 'User answers to ownership verification questions';
COMMENT ON TABLE inquiry_follow_ups IS 'Follow-up questions for match narrowing (>5 matches)';

-- ============================================================================
-- DONE! Your schema is now production-ready
-- ============================================================================
