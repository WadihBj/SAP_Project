-- ============================================================================
-- CREATE ASSISTANTS TABLE
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create assistants table
CREATE TABLE IF NOT EXISTS assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'assistant' CHECK (role IN ('assistant', 'admin', 'supervisor')),
  department TEXT DEFAULT 'Lost & Found',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_assistants_email ON assistants(email);
CREATE INDEX IF NOT EXISTS idx_assistants_status ON assistants(status);

-- Enable RLS
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS assistants_select ON assistants;
CREATE POLICY assistants_select ON assistants
  FOR SELECT USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_assistants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assistants_updated_at ON assistants;
CREATE TRIGGER trigger_assistants_updated_at
BEFORE UPDATE ON assistants
FOR EACH ROW
EXECUTE FUNCTION update_assistants_updated_at();

-- Verify table created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'assistants'
ORDER BY ordinal_position;
