-- ============================================================================
-- ENABLE ASSISTANT ACCESS
-- Updates RLS policies to allow assistants to view all data
-- ============================================================================

-- 1. Update Inquiries Policy
DROP POLICY IF EXISTS inquiries_user_select ON inquiries;
DROP POLICY IF EXISTS inquiries_access_policy ON inquiries;

CREATE POLICY inquiries_access_policy ON inquiries
FOR SELECT USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM assistants 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

-- 2. Update Matches Policy
DROP POLICY IF EXISTS matches_user_access ON matches;
DROP POLICY IF EXISTS matches_access_policy ON matches;

CREATE POLICY matches_access_policy ON matches
FOR SELECT USING (
  auth.uid() = inquiry_user_id 
  OR 
  auth.uid() = inventory_user_id
  OR
  EXISTS (
    SELECT 1 FROM assistants 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

-- Verify the policies are active
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE policyname LIKE '%access_policy%';