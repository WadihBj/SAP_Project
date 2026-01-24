-- ============================================================================
-- COMPLETE RESET AND REBUILD SCRIPT
-- WARNING: This will DELETE ALL DATA and recreate schema from scratch
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PHASE 1: DROP EVERYTHING (cascading to avoid foreign key issues)
-- ============================================================================

-- Drop materialized views first (they depend on tables)
DROP MATERIALIZED VIEW IF EXISTS match_success_by_category CASCADE;
DROP MATERIALIZED VIEW IF EXISTS user_inquiry_summary CASCADE;

-- Drop functions first (triggers depend on them)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS maintain_denormalized_user_ids() CASCADE;

-- Drop tables with CASCADE to handle all foreign keys
DROP TABLE IF EXISTS match_verification_responses CASCADE;
DROP TABLE IF EXISTS inquiry_follow_ups CASCADE;
DROP TABLE IF EXISTS inquiry_status_history CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS inquiry_images CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;

-- ============================================================================
-- PHASE 2: RECREATE CORE TABLES
-- ============================================================================

-- Main Inquiries Table
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('lost', 'found')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_lost_found TEXT,
  date_lost_found DATE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'matched', 'resolved', 'rejected')),
  extracted_attributes JSONB DEFAULT '{}',
  description_quality TEXT DEFAULT 'fair' CHECK (description_quality IN ('poor', 'fair', 'good')),
  image_count INTEGER DEFAULT 0 CHECK (image_count >= 0 AND image_count <= 5),
  fraud_risk_score NUMERIC(5,2) DEFAULT 0 CHECK (fraud_risk_score >= 0 AND fraud_risk_score <= 100),
  requires_verification BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items Table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  material TEXT,
  condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  distinctive_marks TEXT,
  location_stored TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'resolved')),
  extracted_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inquiry Images Table
CREATE TABLE inquiry_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Denormalized for RLS performance
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'image/jpeg' CHECK (mime_type LIKE 'image/%'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inquiry Status History Table (audit trail)
CREATE TABLE inquiry_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Denormalized for RLS performance
  old_status TEXT,
  new_status TEXT NOT NULL CHECK (new_status IN ('submitted', 'under_review', 'matched', 'resolved', 'rejected')),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches Table (inquiry to inventory item mapping)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  inquiry_user_id UUID REFERENCES auth.users(id), -- Denormalized owner of inquiry
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  inventory_user_id UUID REFERENCES auth.users(id), -- Denormalized owner of item
  confidence_score NUMERIC(5,4) DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  final_confidence NUMERIC(5,4) DEFAULT 0 CHECK (final_confidence >= 0 AND final_confidence <= 1),
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'verification_submitted', 'verified', 'rejected', 'resolved')),
  matching_details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_inquiry_item UNIQUE (inquiry_id, inventory_item_id)
);

-- Match Verification Responses Table (ownership verification)
CREATE TABLE match_verification_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'inconclusive')),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- Inquiry Follow-ups Table (for match narrowing when >5 matches)
CREATE TABLE inquiry_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Denormalized for RLS performance
  question_set INTEGER NOT NULL,
  responses JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Inquiries Indexes
CREATE INDEX idx_inquiries_user_created ON inquiries(user_id, created_at DESC); -- Composite index for common queries
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX idx_inquiries_fraud_risk ON inquiries(fraud_risk_score DESC);
CREATE INDEX idx_inquiries_user_status ON inquiries(user_id, status);
CREATE INDEX idx_inquiries_attributes ON inquiries USING GIN (extracted_attributes); -- GIN index for JSONB

-- Inventory Items Indexes
CREATE INDEX idx_inventory_user_id ON inventory_items(user_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_inventory_created_at ON inventory_items(created_at DESC);

-- Inquiry Images Indexes
CREATE INDEX idx_inquiry_images_inquiry_id ON inquiry_images(inquiry_id);
CREATE INDEX idx_inquiry_images_created_at ON inquiry_images(created_at DESC);

-- Status History Indexes
CREATE INDEX idx_status_history_inquiry_id ON inquiry_status_history(inquiry_id);
CREATE INDEX idx_status_history_created_at ON inquiry_status_history(created_at DESC);

-- Matches Indexes
CREATE INDEX idx_matches_inquiry_id ON matches(inquiry_id);
CREATE INDEX idx_matches_inventory_item_id ON matches(inventory_item_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_confidence ON matches(final_confidence DESC);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX idx_matches_details ON matches USING GIN (matching_details); -- GIN index for JSONB

-- Verification Indexes
CREATE INDEX idx_verification_match_id ON match_verification_responses(match_id);
CREATE INDEX idx_verification_status ON match_verification_responses(verification_status);

-- Follow-ups Index
CREATE INDEX idx_follow_ups_inquiry_id ON inquiry_follow_ups(inquiry_id);

-- ============================================================================
-- PHASE 4: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_verification_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Inquiries
CREATE POLICY inquiries_user_select ON inquiries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY inquiries_user_insert ON inquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY inquiries_user_update ON inquiries
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Inventory Items
CREATE POLICY inventory_user_select ON inventory_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY inventory_user_insert ON inventory_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY inventory_user_update ON inventory_items
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Images
CREATE POLICY images_user_access ON inquiry_images
  FOR SELECT USING (
    auth.uid() = user_id -- Optimized: No subquery needed
  );

-- RLS Policies for Status History
CREATE POLICY status_history_user_access ON inquiry_status_history
  FOR SELECT USING (
    auth.uid() = user_id -- Optimized: No subquery needed
  );

-- RLS Policies for Matches
CREATE POLICY matches_user_access ON matches
  FOR SELECT USING (
    auth.uid() = inquiry_user_id OR auth.uid() = inventory_user_id
  );

-- RLS Policies for Follow Ups
CREATE POLICY follow_ups_user_access ON inquiry_follow_ups
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- PHASE 5: CREATE TRIGGERS FOR AUDIT COLUMNS
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to maintain denormalized user_ids
CREATE OR REPLACE FUNCTION maintain_denormalized_user_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- For tables linking to inquiries
  IF TG_TABLE_NAME IN ('inquiry_images', 'inquiry_status_history', 'inquiry_follow_ups') THEN
    IF NEW.user_id IS NULL THEN
      SELECT user_id INTO NEW.user_id FROM inquiries WHERE id = NEW.inquiry_id;
    END IF;
  END IF;
  
  -- For matches table
  IF TG_TABLE_NAME = 'matches' THEN
    IF NEW.inquiry_user_id IS NULL THEN
      SELECT user_id INTO NEW.inquiry_user_id FROM inquiries WHERE id = NEW.inquiry_id;
    END IF;
    IF NEW.inventory_user_id IS NULL THEN
      SELECT user_id INTO NEW.inventory_user_id FROM inventory_items WHERE id = NEW.inventory_item_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inquiries table
CREATE TRIGGER trigger_inquiries_updated_at
BEFORE UPDATE ON inquiries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for inventory_items table
CREATE TRIGGER trigger_inventory_updated_at
BEFORE UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for matches table
CREATE TRIGGER trigger_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Triggers for denormalization (Performance Optimization)
CREATE TRIGGER trigger_images_user_id
BEFORE INSERT ON inquiry_images
FOR EACH ROW EXECUTE FUNCTION maintain_denormalized_user_ids();

CREATE TRIGGER trigger_history_user_id
BEFORE INSERT ON inquiry_status_history
FOR EACH ROW EXECUTE FUNCTION maintain_denormalized_user_ids();

CREATE TRIGGER trigger_followups_user_id
BEFORE INSERT ON inquiry_follow_ups
FOR EACH ROW EXECUTE FUNCTION maintain_denormalized_user_ids();

CREATE TRIGGER trigger_matches_user_ids
BEFORE INSERT ON matches
FOR EACH ROW EXECUTE FUNCTION maintain_denormalized_user_ids();

-- ============================================================================
-- PHASE 6: CREATE MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- User activity summary
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
-- PHASE 7: TABLE DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE inquiries IS 'Core inquiry records for lost/found items submitted by users';
COMMENT ON COLUMN inquiries.fraud_risk_score IS 'Fraud detection score (0-100) based on rate limiting and behavior';
COMMENT ON COLUMN inquiries.requires_verification IS 'Flag indicating ownership verification needed';
COMMENT ON COLUMN inquiries.extracted_attributes IS 'ML-extracted item details (category, color, condition, etc.)';

COMMENT ON TABLE inventory_items IS 'Lost/found items stored in system inventory';
COMMENT ON COLUMN inventory_items.status IS 'Item status: available, claimed, or resolved';

COMMENT ON TABLE matches IS 'Potential matches between inquiries and inventory items';
COMMENT ON COLUMN matches.confidence_score IS 'Initial confidence score (0-1) from matching algorithm';
COMMENT ON COLUMN matches.final_confidence IS 'Adjusted confidence after fraud assessment';

COMMENT ON TABLE match_verification_responses IS 'User-provided ownership verification answers';
COMMENT ON TABLE inquiry_follow_ups IS 'Follow-up questions for narrowing down matches (>5 matches)';

-- ============================================================================
-- SUCCESS! Database is now fresh and ready to use
-- ============================================================================

-- Check table structure
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
