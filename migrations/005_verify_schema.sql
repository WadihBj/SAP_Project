-- ============================================================================
-- COMPREHENSIVE VERIFICATION SCRIPT
-- Run this to verify all tables are properly set up
-- ============================================================================

-- ============================================================================
-- VERIFY TABLE STRUCTURES
-- ============================================================================

-- Check inquiries table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inquiries'
ORDER BY ordinal_position;

-- Check inventory_items table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items'
ORDER BY ordinal_position;

-- Check inquiry_images table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inquiry_images'
ORDER BY ordinal_position;

-- Check matches table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'matches'
ORDER BY ordinal_position;

-- ============================================================================
-- VERIFY ALL TABLES EXIST
-- ============================================================================

SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('inquiries', 'inventory_items', 'inquiry_images', 'matches', 'inquiry_status_history', 'match_verification_responses', 'inquiry_follow_ups')
ORDER BY tablename;

-- ============================================================================
-- VERIFY INDEXES EXIST
-- ============================================================================

SELECT 
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('inquiries', 'inventory_items', 'inquiry_images', 'matches', 'inquiry_status_history', 'match_verification_responses', 'inquiry_follow_ups')
ORDER BY tablename, indexname;

-- ============================================================================
-- VERIFY OPTIMIZATIONS (Denormalization & Indexes)
-- ============================================================================

SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname IN ('idx_inquiries_user_created', 'idx_inquiries_attributes', 'idx_matches_details')
ORDER BY tablename;

-- ============================================================================
-- VERIFY FOREIGN KEY RELATIONSHIPS
-- ============================================================================

SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS referenced_table_name,
  ccu.column_name AS referenced_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- VERIFY TRIGGERS AND FUNCTIONS
-- ============================================================================

SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SUCCESS! Everything is connected
-- ============================================================================
