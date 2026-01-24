-- ============================================================================
-- VERIFY ASSISTANT PERMISSIONS
-- Simulates an assistant trying to view another user's data
-- ============================================================================

DO LANGUAGE plpgsql $$
DECLARE
  assistant_user_id UUID;
  normal_user_id UUID;
  secret_inquiry_id UUID;
  can_see BOOLEAN;
BEGIN
  -- 1. Find the Assistant
  SELECT user_id INTO assistant_user_id FROM assistants WHERE status = 'active' LIMIT 1;
  
  IF assistant_user_id IS NULL THEN
    RAISE EXCEPTION '❌ No active assistant found. Run migration 012 first.';
  END IF;

  -- 2. Find a Normal User (anyone who is NOT the assistant)
  SELECT id INTO normal_user_id FROM auth.users WHERE id != assistant_user_id LIMIT 1;
  
  IF normal_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Only one user exists. Creating a temporary fake user ID for testing...';
    normal_user_id := gen_random_uuid(); -- This works for RLS testing even if user doesn't exist in auth
  END IF;

  RAISE NOTICE '🧪 Testing Access: Assistant (%) vs Normal User (%)', assistant_user_id, normal_user_id;

  -- 3. Create a "Secret" Inquiry as the Normal User
  -- We temporarily disable RLS for the INSERT to ensure setup works
  ALTER TABLE inquiries DISABLE ROW LEVEL SECURITY;
  
  INSERT INTO inquiries (user_id, inquiry_type, title, description)
  VALUES (normal_user_id, 'lost', 'SECRET_TEST_ITEM', 'Hidden item for testing')
  RETURNING id INTO secret_inquiry_id;
  
  ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

  -- 4. SIMULATE: Switch context to the Assistant User
  -- This tricks the database into thinking the current query is run by the assistant
  PERFORM set_config('request.jwt.claim.sub', assistant_user_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- 5. TEST: Can we see the secret item?
  SELECT EXISTS(SELECT 1 FROM inquiries WHERE id = secret_inquiry_id) INTO can_see;

  -- 6. CLEANUP
  -- Switch back to postgres admin to delete
  PERFORM set_config('request.jwt.claim.sub', NULL, true);
  PERFORM set_config('role', 'postgres', true);
  DELETE FROM inquiries WHERE id = secret_inquiry_id;

  -- 7. REPORT RESULTS
  IF can_see THEN
    RAISE NOTICE '✅ SUCCESS: Assistant was able to view the secret item!';
  ELSE
    RAISE EXCEPTION '❌ FAILURE: Assistant could NOT view the item. Check policies.';
  END IF;
END $$;