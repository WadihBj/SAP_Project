-- ============================================================================
-- COMPLETE DATABASE WIPE
-- WARNING: THIS WILL DELETE EVERYTHING IN YOUR SUPABASE PROJECT
-- ALL DATA WILL BE PERMANENTLY LOST
-- ============================================================================

-- ============================================================================
-- PHASE 1: DROP ALL MATERIALIZED VIEWS
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS match_success_by_category CASCADE;
DROP MATERIALIZED VIEW IF EXISTS user_inquiry_summary CASCADE;

-- ============================================================================
-- PHASE 2: DROP ALL FUNCTIONS AND TRIGGERS
-- ============================================================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- PHASE 3: DROP ALL USER-CREATED TABLES
-- ============================================================================

DROP TABLE IF EXISTS match_verification_responses CASCADE;
DROP TABLE IF EXISTS match_success_by_category CASCADE;
DROP TABLE IF EXISTS inquiry_follow_ups CASCADE;
DROP TABLE IF EXISTS inquiry_status_history CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS inquiry_images CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS verification_answers CASCADE;
DROP TABLE IF EXISTS verification_questions CASCADE;
DROP TABLE IF EXISTS lost_found_reports CASCADE;
DROP TABLE IF EXISTS assistants CASCADE;
DROP TABLE IF EXISTS user_inquiry_summary CASCADE;

-- ============================================================================
-- VERIFY ALL TABLES ARE DELETED
-- ============================================================================

SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- DONE! Database is now completely empty
-- ============================================================================
