-- ============================================================================
-- OPTIMIZATION NOTE:
-- We are NOT disabling RLS. Disabling RLS makes tables public to anyone with
-- permissions. Instead, we have optimized the RLS policies in migration 002
-- by denormalizing user_id columns, making checks O(1) fast.
-- ============================================================================

-- COMMENTED OUT FOR SECURITY:
-- ALTER TABLE inquiry_status_history DISABLE ROW LEVEL SECURITY;

-- COMMENTED OUT FOR SECURITY:
-- ALTER TABLE inquiry_follow_ups DISABLE ROW LEVEL SECURITY;

-- COMMENTED OUT FOR SECURITY:
-- ALTER TABLE match_verification_responses DISABLE ROW LEVEL SECURITY;

-- Verify RLS status
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('inquiries', 'inventory_items', 'inquiry_images', 'inquiry_status_history', 'matches', 'match_verification_responses', 'inquiry_follow_ups')
ORDER BY tablename;
