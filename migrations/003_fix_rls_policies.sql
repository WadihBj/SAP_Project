-- ============================================================================
-- Fix RLS Policies on Extra Tables
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PHASE 1: ENABLE RLS ON EXTRA TABLES
-- ============================================================================

-- Wrap in DO block to prevent failure if table doesn't exist yet (created in 009)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assistants') THEN
        ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verification_answers') THEN
        ALTER TABLE verification_answers ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verification_questions') THEN
        ALTER TABLE verification_questions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================================================
-- PHASE 2: CREATE RLS POLICIES
-- ============================================================================

-- Assistants Table Policies (if not already exists, these will be created)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assistants') THEN
        DROP POLICY IF EXISTS assistants_public_read ON assistants;
        CREATE POLICY assistants_public_read ON assistants
          FOR SELECT USING (true);
    END IF;
END $$;

-- Verification Answers Policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verification_answers') THEN
        DROP POLICY IF EXISTS verification_answers_user_access ON verification_answers;
        CREATE POLICY verification_answers_user_access ON verification_answers
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS verification_answers_user_insert ON verification_answers;
        CREATE POLICY verification_answers_user_insert ON verification_answers
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Verification Questions Policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verification_questions') THEN
        DROP POLICY IF EXISTS verification_questions_public_read ON verification_questions;
        CREATE POLICY verification_questions_public_read ON verification_questions
          FOR SELECT USING (true);
    END IF;
END $$;

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
