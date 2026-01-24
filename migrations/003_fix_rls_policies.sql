-- ============================================================================
-- Fix RLS Policies on Extra Tables
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PHASE 1: ENABLE RLS ON EXTRA TABLES
-- ============================================================================

ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_questions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 2: CREATE RLS POLICIES
-- ============================================================================

-- Assistants Table Policies (if not already exists, these will be created)
DROP POLICY IF EXISTS assistants_public_read ON assistants;
CREATE POLICY assistants_public_read ON assistants
  FOR SELECT USING (true);

-- Verification Answers Policies
DROP POLICY IF EXISTS verification_answers_user_access ON verification_answers;
CREATE POLICY verification_answers_user_access ON verification_answers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS verification_answers_user_insert ON verification_answers;
CREATE POLICY verification_answers_user_insert ON verification_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verification Questions Policies
DROP POLICY IF EXISTS verification_questions_public_read ON verification_questions;
CREATE POLICY verification_questions_public_read ON verification_questions
  FOR SELECT USING (true);

-- ============================================================================
-- DONE! All tables now have proper RLS
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
