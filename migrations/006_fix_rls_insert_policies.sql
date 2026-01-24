-- ============================================================================
-- FIX: Add INSERT policy for inquiry_status_history
-- ============================================================================

-- Add INSERT policy for Status History (allow users to insert for their inquiries)
DROP POLICY IF EXISTS status_history_user_insert ON inquiry_status_history;
CREATE POLICY status_history_user_insert ON inquiry_status_history
  FOR INSERT WITH CHECK (
    auth.uid() = user_id -- Optimized: Uses denormalized column
  );

-- Also add INSERT policy for inquiry_follow_ups
DROP POLICY IF EXISTS follow_ups_user_insert ON inquiry_follow_ups;
CREATE POLICY follow_ups_user_insert ON inquiry_follow_ups
  FOR INSERT WITH CHECK (
    auth.uid() = user_id -- Optimized: Uses denormalized column
  );

-- Add SELECT policy for inquiry_follow_ups
DROP POLICY IF EXISTS follow_ups_user_select ON inquiry_follow_ups;
CREATE POLICY follow_ups_user_select ON inquiry_follow_ups
  FOR SELECT USING (
    auth.uid() = user_id -- Optimized: Uses denormalized column
  );

-- Verify RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('inquiry_status_history', 'inquiry_follow_ups')
ORDER BY tablename, policyname;
